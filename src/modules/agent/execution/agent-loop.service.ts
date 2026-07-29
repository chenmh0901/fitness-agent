import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AgentContextService } from '../context/agent-context.service';
import { AIMessage, AIProvider, AIToolCallResponse } from '../provider/ai-provider.interface';
import { AI_PROVIDER } from '../provider/ai-provider.token';
import { PromptBuilderService } from '../prompt/prompt-builder.service';
import { ToolRegistryService } from '../tools/tool-registry.service';

export const MAX_AGENT_TOOL_CALLS = 3;

@Injectable()
export class AgentLoopService {
  private readonly logger = new Logger(AgentLoopService.name);

  constructor(
    private readonly agentContextService: AgentContextService,
    private readonly promptBuilderService: PromptBuilderService,
    @Inject(AI_PROVIDER) private readonly aiProvider: AIProvider,
    private readonly toolRegistryService: ToolRegistryService,
    private readonly configService: ConfigService,
  ) {}

  async run(userMessage: string): Promise<string> {
    this.logInDevelopment(`User input: ${userMessage}`);

    const context = await this.agentContextService.buildContext();
    const messages: AIMessage[] = [
      ...this.promptBuilderService.buildMessages(context, userMessage),
    ];
    let toolCallCount = 0;

    while (true) {
      const response = await this.aiProvider.chat([...messages]);

      if (response.type === 'text') {
        return response.content;
      }

      if (toolCallCount >= MAX_AGENT_TOOL_CALLS) {
        throw new Error(`Agent tool call limit exceeded (${MAX_AGENT_TOOL_CALLS})`);
      }

      const tool = this.toolRegistryService.get(response.toolName);

      if (!tool) {
        throw new Error(`Unknown agent tool: ${response.toolName}`);
      }

      toolCallCount += 1;
      this.logInDevelopment(`Tool name: ${response.toolName}`);
      this.logInDevelopment(`Tool arguments: ${JSON.stringify(response.arguments)}`);
      messages.push(this.toAssistantToolCallMessage(response));

      const toolResult = await tool.execute(response.arguments);
      const serializedToolResult = JSON.stringify(toolResult) ?? 'null';
      this.logInDevelopment(`Tool result: ${serializedToolResult}`);
      messages.push({
        role: 'tool',
        toolName: response.toolName,
        content: serializedToolResult,
      });
    }
  }

  private logInDevelopment(message: string): void {
    if (this.configService.get<string>('NODE_ENV') === 'development') {
      this.logger.log(message);
    }
  }

  private toAssistantToolCallMessage(response: AIToolCallResponse): AIMessage {
    return {
      role: 'assistant',
      content: '',
      toolName: response.toolName,
      arguments: response.arguments,
    };
  }
}
