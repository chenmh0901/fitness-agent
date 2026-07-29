import { Injectable } from '@nestjs/common';
import { AgentTool } from './agent-tool.interface';
import {
  OpenAIFunctionToolDefinition,
  ToolSchemaBuilderService,
} from './tool-schema-builder.service';

@Injectable()
export class ToolRegistryService {
  private readonly tools = new Map<string, AgentTool>();

  constructor(private readonly toolSchemaBuilderService: ToolSchemaBuilderService) {}

  register(tool: AgentTool): void {
    if (!tool.name.trim()) {
      throw new TypeError('Agent tool name must not be empty');
    }

    if (this.tools.has(tool.name)) {
      throw new Error(`Agent tool "${tool.name}" is already registered`);
    }

    this.tools.set(tool.name, tool);
  }

  get(name: string): AgentTool | undefined {
    return this.tools.get(name);
  }

  getAll(): readonly AgentTool[] {
    return [...this.tools.values()];
  }

  getDefinitions(): readonly OpenAIFunctionToolDefinition[] {
    return this.toolSchemaBuilderService.build(this.getAll());
  }
}
