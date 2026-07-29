import { Injectable } from '@nestjs/common';
import type { ChatCompletionFunctionTool } from 'openai/resources/chat/completions';
import { AgentTool } from './agent-tool.interface';

export type OpenAIFunctionToolDefinition = ChatCompletionFunctionTool;

@Injectable()
export class ToolSchemaBuilderService {
  build(tools: readonly AgentTool[]): readonly OpenAIFunctionToolDefinition[] {
    return tools.map((tool) => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    }));
  }
}
