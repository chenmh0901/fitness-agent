import { AgentContextService } from '../context/agent-context.service';
import { CoachContextWithInsightsDto } from '../context/coach-context-with-insights.dto';
import { GetDailyContextTool } from './get-daily-context.tool';

describe('GetDailyContextTool', () => {
  const buildContext = jest.fn();
  const agentContextService = {
    buildContext,
  } as unknown as AgentContextService;
  const tool = new GetDailyContextTool(agentContextService);

  beforeEach(() => {
    buildContext.mockReset();
  });

  it('exposes stable metadata', () => {
    expect(tool.name).toBe('get_daily_context');
    expect(tool.description).toContain('只读 Coach Context');
    expect(tool.description).toContain('Coach Insights');
    expect(tool.description).toContain('Recommendations');
    expect(tool.parameters).toEqual({
      type: 'object',
      properties: {},
    });
  });

  it('delegates execution to AgentContextService', async () => {
    const context = {
      coachContext: { userProfile: null },
      status: 'insufficient_data',
      insights: [],
      recommendations: [],
    } as unknown as CoachContextWithInsightsDto;
    buildContext.mockResolvedValue(context);

    await expect(tool.execute()).resolves.toBe(context);
    expect(buildContext).toHaveBeenCalledTimes(1);
  });
});
