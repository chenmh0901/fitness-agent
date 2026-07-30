import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import type {
  ChatCompletionFunctionTool,
  ChatCompletionMessage,
  ChatCompletionMessageParam,
} from 'openai/resources/chat/completions';
import { ToolRegistryService } from '../../tools/tool-registry.service';
import { AIMessage, AIProvider, AIResponse, AIToolArguments } from '../ai-provider.interface';

const DEEPSEEK_BASE_URL = 'https://api.deepseek.com';
const DEFAULT_DEEPSEEK_MODEL = 'deepseek-v4-flash';
const SENSITIVE_FIELD_PATTERN = /api.?key|authorization|token|secret/i;
const BEARER_TOKEN_PATTERN = /\bBearer\s+\S+/gi;
const SECRET_KEY_PATTERN = /\bsk-[A-Za-z0-9_-]+\b/g;

export const DEEPSEEK_SDK_CLIENT = Symbol('DEEPSEEK_SDK_CLIENT');

export class DeepSeekProviderError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'DeepSeekProviderError';
  }
}

interface PendingToolCall {
  readonly id: string;
  readonly name: string;
}

interface DeepSeekToolCallHistoryItem extends PendingToolCall {
  readonly arguments: string;
  readonly reasoningContent?: string | null;
}

@Injectable()
export class DeepSeekAIProvider implements AIProvider {
  private readonly logger = new Logger(DeepSeekAIProvider.name);
  private readonly toolCallHistory: DeepSeekToolCallHistoryItem[] = [];
  private readonly client?: OpenAI;
  private readonly model: string;

  constructor(
    configService: ConfigService,
    private readonly toolRegistryService: ToolRegistryService,
    @Optional() @Inject(DEEPSEEK_SDK_CLIENT) client?: OpenAI,
  ) {
    const apiKey = configService.get<string>('DEEPSEEK_API_KEY')?.trim();

    this.model = configService.get<string>('DEEPSEEK_MODEL')?.trim() || DEFAULT_DEEPSEEK_MODEL;
    this.client =
      client ??
      (apiKey
        ? new OpenAI({
            apiKey,
            baseURL: DEEPSEEK_BASE_URL,
          })
        : undefined);
  }

  async chat(messages: readonly AIMessage[]): Promise<AIResponse> {
    if (!this.client) {
      throw new DeepSeekProviderError(
        'DeepSeek provider is not configured: DEEPSEEK_API_KEY is missing',
      );
    }

    if (!messages.some((message) => message.role === 'assistant' && message.toolName)) {
      this.toolCallHistory.length = 0;
    }

    try {
      const tools = this.getDeepSeekToolDefinitions();
      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages: this.toDeepSeekMessages(messages),
        ...(tools.length > 0
          ? {
              tools,
              tool_choice: 'auto' as const,
              parallel_tool_calls: false,
            }
          : {}),
      });
      const choice = completion.choices[0];

      if (!choice) {
        throw new DeepSeekProviderError('DeepSeek returned no completion choices');
      }

      return this.toAIResponse(choice.message);
    } catch (error: unknown) {
      if (error instanceof DeepSeekProviderError) {
        throw error;
      }

      if (error instanceof OpenAI.APIError) {
        const status = error.status === undefined ? 'unknown' : String(error.status);
        const safeMessage = this.sanitizeText(error.message);

        this.logApiError(error);

        throw new DeepSeekProviderError(
          `DeepSeek API request failed (status: ${status}): ${safeMessage}`,
          {
            cause: error,
          },
        );
      }

      throw new DeepSeekProviderError('DeepSeek API request failed', { cause: error });
    }
  }

  private getDeepSeekToolDefinitions(): ChatCompletionFunctionTool[] {
    return this.toolRegistryService.getDefinitions().map((tool) => {
      const sourceParameters = this.isRecord(tool.function.parameters)
        ? tool.function.parameters
        : {};
      const sourceProperties = this.isRecord(sourceParameters.properties)
        ? sourceParameters.properties
        : {};
      const properties = { ...sourceProperties };

      if (tool.function.name === 'get_weight_trend' && this.isRecord(properties.days)) {
        properties.days = {
          ...properties.days,
          type: 'integer',
        };
      }

      return {
        type: 'function',
        function: {
          name: tool.function.name,
          description: tool.function.description,
          parameters: {
            ...sourceParameters,
            type: 'object',
            properties,
            additionalProperties: false,
          },
        },
      };
    });
  }

  private toDeepSeekMessages(messages: readonly AIMessage[]): ChatCompletionMessageParam[] {
    const pendingToolCalls: PendingToolCall[] = [];
    let toolCallHistoryIndex = 0;

    return messages.map((message, index) => {
      if (message.role === 'system' || message.role === 'user') {
        return {
          role: message.role,
          content: message.content,
        };
      }

      if (message.role === 'assistant') {
        if (!message.toolName) {
          return {
            role: 'assistant',
            content: message.content,
          };
        }

        const recordedToolCall = this.findRecordedToolCall(message.toolName, toolCallHistoryIndex);
        const toolCallId = recordedToolCall?.id ?? `call_${index}`;
        const serializedArguments =
          recordedToolCall?.arguments ?? this.serializeArguments(message.arguments ?? {});

        if (recordedToolCall) {
          toolCallHistoryIndex = recordedToolCall.index + 1;
        }

        pendingToolCalls.push({ id: toolCallId, name: message.toolName });

        const assistantMessage: ChatCompletionMessageParam & {
          reasoning_content?: string | null;
        } = {
          role: 'assistant',
          content: message.content || null,
          tool_calls: [
            {
              id: toolCallId,
              type: 'function',
              function: {
                name: message.toolName,
                arguments: serializedArguments,
              },
            },
          ],
        };

        if (recordedToolCall?.reasoningContent !== undefined) {
          assistantMessage.reasoning_content = recordedToolCall.reasoningContent;
        }

        return assistantMessage;
      }

      if (!message.toolName) {
        throw new DeepSeekProviderError('Tool result message is missing its tool name');
      }

      const pendingIndex = pendingToolCalls.findIndex(
        (toolCall) => toolCall.name === message.toolName,
      );

      if (pendingIndex === -1) {
        throw new DeepSeekProviderError(
          `Tool result has no matching assistant tool call: ${message.toolName}`,
        );
      }

      const [pendingToolCall] = pendingToolCalls.splice(pendingIndex, 1);

      return {
        role: 'tool',
        tool_call_id: pendingToolCall.id,
        content: message.content,
      };
    });
  }

  private serializeArguments(argumentsValue: AIToolArguments): string {
    try {
      return JSON.stringify(argumentsValue);
    } catch (error: unknown) {
      throw new DeepSeekProviderError('Could not serialize tool call arguments', {
        cause: error,
      });
    }
  }

  private toAIResponse(message: ChatCompletionMessage): AIResponse {
    const toolCalls = message.tool_calls ?? [];

    if (toolCalls.length > 1) {
      throw new DeepSeekProviderError(
        'DeepSeek returned multiple tool calls, but the agent supports one at a time',
      );
    }

    const toolCall = toolCalls[0];

    if (toolCall) {
      if (toolCall.type !== 'function') {
        throw new DeepSeekProviderError(`Unsupported DeepSeek tool call type: ${toolCall.type}`);
      }

      this.toolCallHistory.push({
        id: toolCall.id,
        name: toolCall.function.name,
        arguments: toolCall.function.arguments,
        reasoningContent: this.getReasoningContent(message),
      });

      return {
        type: 'tool_call',
        toolName: toolCall.function.name,
        arguments: this.parseArguments(toolCall.function.arguments),
      };
    }

    const content = message.content ?? message.refusal;

    if (content === null) {
      throw new DeepSeekProviderError('DeepSeek returned neither text nor a tool call');
    }

    return {
      type: 'text',
      content,
    };
  }

  private parseArguments(rawArguments: string): AIToolArguments {
    let parsed: unknown;

    try {
      parsed = JSON.parse(rawArguments);
    } catch (error: unknown) {
      throw new DeepSeekProviderError('DeepSeek returned invalid JSON tool arguments', {
        cause: error,
      });
    }

    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new DeepSeekProviderError('DeepSeek tool arguments must be a JSON object');
    }

    return parsed as AIToolArguments;
  }

  private findRecordedToolCall(
    toolName: string,
    startIndex: number,
  ): (DeepSeekToolCallHistoryItem & { index: number }) | undefined {
    for (let index = startIndex; index < this.toolCallHistory.length; index += 1) {
      const item = this.toolCallHistory[index];

      if (item.name === toolName) {
        return {
          ...item,
          index,
        };
      }
    }

    return undefined;
  }

  private getReasoningContent(message: ChatCompletionMessage): string | null | undefined {
    const messageValue: unknown = message;

    if (!this.isRecord(messageValue)) {
      return undefined;
    }

    const reasoningContent = messageValue.reasoning_content;

    if (typeof reasoningContent === 'string' || reasoningContent === null) {
      return reasoningContent;
    }

    return undefined;
  }

  private logApiError(error: unknown): void {
    const errorRecord = this.isRecord(error) ? error : {};
    const diagnostic = {
      status: typeof errorRecord.status === 'number' ? errorRecord.status : null,
      message:
        typeof errorRecord.message === 'string'
          ? this.sanitizeText(errorRecord.message)
          : 'Unknown DeepSeek API error',
      responseBody: this.sanitizeForLog(errorRecord.error ?? null),
    };

    this.logger.error(`DeepSeek API error: ${JSON.stringify(diagnostic)}`);
  }

  private sanitizeForLog(value: unknown): unknown {
    if (typeof value === 'string') {
      return this.sanitizeText(value);
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.sanitizeForLog(item));
    }

    if (!this.isRecord(value)) {
      return value;
    }

    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [
        key,
        SENSITIVE_FIELD_PATTERN.test(key) ? '[REDACTED]' : this.sanitizeForLog(nestedValue),
      ]),
    );
  }

  private sanitizeText(value: string): string {
    return value
      .replace(BEARER_TOKEN_PATTERN, 'Bearer [REDACTED]')
      .replace(SECRET_KEY_PATTERN, '[REDACTED]');
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}
