import { Inject, Injectable, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import type {
  ChatCompletionMessage,
  ChatCompletionMessageParam,
} from 'openai/resources/chat/completions';
import { ToolRegistryService } from '../../tools/tool-registry.service';
import { AIMessage, AIProvider, AIResponse, AIToolArguments } from '../ai-provider.interface';

export const OPENAI_SDK_CLIENT = Symbol('OPENAI_SDK_CLIENT');

export class OpenAIProviderError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'OpenAIProviderError';
  }
}

interface PendingToolCall {
  readonly id: string;
  readonly name: string;
}

@Injectable()
export class OpenAIAIProvider implements AIProvider {
  private readonly client: OpenAI;
  private readonly model: string;

  constructor(
    configService: ConfigService,
    private readonly toolRegistryService: ToolRegistryService,
    @Optional() @Inject(OPENAI_SDK_CLIENT) client?: OpenAI,
  ) {
    const apiKey = configService.getOrThrow<string>('OPENAI_API_KEY');

    this.model = configService.getOrThrow<string>('OPENAI_MODEL');
    this.client = client ?? new OpenAI({ apiKey });
  }

  async chat(messages: readonly AIMessage[]): Promise<AIResponse> {
    try {
      const tools = [...this.toolRegistryService.getDefinitions()];
      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages: this.toOpenAIMessages(messages),
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
        throw new OpenAIProviderError('OpenAI returned no completion choices');
      }

      return this.toAIResponse(choice.message);
    } catch (error: unknown) {
      if (error instanceof OpenAIProviderError) {
        throw error;
      }

      if (error instanceof OpenAI.APIError) {
        const status = error.status === undefined ? 'unknown' : String(error.status);

        throw new OpenAIProviderError(`OpenAI API request failed (status: ${status})`, {
          cause: error,
        });
      }

      throw new OpenAIProviderError('OpenAI API request failed', { cause: error });
    }
  }

  private toOpenAIMessages(messages: readonly AIMessage[]): ChatCompletionMessageParam[] {
    const pendingToolCalls: PendingToolCall[] = [];

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

        const toolCallId = `call_${index}`;
        pendingToolCalls.push({ id: toolCallId, name: message.toolName });

        return {
          role: 'assistant',
          content: message.content || null,
          tool_calls: [
            {
              id: toolCallId,
              type: 'function',
              function: {
                name: message.toolName,
                arguments: this.serializeArguments(message.arguments ?? {}),
              },
            },
          ],
        };
      }

      if (!message.toolName) {
        throw new OpenAIProviderError('Tool result message is missing its tool name');
      }

      const pendingIndex = pendingToolCalls.findIndex(
        (toolCall) => toolCall.name === message.toolName,
      );

      if (pendingIndex === -1) {
        throw new OpenAIProviderError(
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
      throw new OpenAIProviderError('Could not serialize tool call arguments', {
        cause: error,
      });
    }
  }

  private toAIResponse(message: ChatCompletionMessage): AIResponse {
    const toolCalls = message.tool_calls ?? [];

    if (toolCalls.length > 1) {
      throw new OpenAIProviderError(
        'OpenAI returned multiple tool calls, but the agent supports one at a time',
      );
    }

    const toolCall = toolCalls[0];

    if (toolCall) {
      if (toolCall.type !== 'function') {
        throw new OpenAIProviderError(`Unsupported OpenAI tool call type: ${toolCall.type}`);
      }

      return {
        type: 'tool_call',
        toolName: toolCall.function.name,
        arguments: this.parseArguments(toolCall.function.arguments),
      };
    }

    const content = message.content ?? message.refusal;

    if (content === null) {
      throw new OpenAIProviderError('OpenAI returned neither text nor a tool call');
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
      throw new OpenAIProviderError('OpenAI returned invalid JSON tool arguments', {
        cause: error,
      });
    }

    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new OpenAIProviderError('OpenAI tool arguments must be a JSON object');
    }

    return parsed as AIToolArguments;
  }
}
