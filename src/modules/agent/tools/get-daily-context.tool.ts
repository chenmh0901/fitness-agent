import { Injectable } from '@nestjs/common';
import { AgentContextDto } from '../context/agent-context.dto';
import { AgentContextService } from '../context/agent-context.service';
import { AgentTool, JsonSchema } from './agent-tool.interface';

@Injectable()
export class GetDailyContextTool implements AgentTool {
  readonly name = 'get_daily_context';
  readonly description = '获取用户当前完整的只读健身上下文，包括档案、训练、体重、睡眠和近期表现。';
  readonly parameters: JsonSchema = {
    type: 'object',
    properties: {},
  };

  constructor(private readonly agentContextService: AgentContextService) {}

  execute(): Promise<AgentContextDto> {
    return this.agentContextService.buildContext();
  }
}
