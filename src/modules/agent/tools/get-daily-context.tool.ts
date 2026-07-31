import { Injectable } from '@nestjs/common';
import { AgentContextService } from '../context/agent-context.service';
import { CoachContextWithInsightsDto } from '../context/coach-context-with-insights.dto';
import { AgentTool, JsonSchema } from './agent-tool.interface';

@Injectable()
export class GetDailyContextTool implements AgentTool {
  readonly name = 'get_daily_context';
  readonly description =
    '获取用户当前完整的只读 Coach Context、Coach Insights 和可执行 Recommendations，包括长期目标、训练执行率、体重、睡眠、营养、每日状态和近期训练表现。';
  readonly parameters: JsonSchema = {
    type: 'object',
    properties: {},
  };

  constructor(private readonly agentContextService: AgentContextService) {}

  execute(): Promise<CoachContextWithInsightsDto> {
    return this.agentContextService.buildContext();
  }
}
