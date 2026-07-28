import { AgentContextDto } from '../context/agent-context.dto';
import { AgentContextService } from '../context/agent-context.service';
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
    expect(tool.description).toContain('只读健身上下文');
  });

  it('delegates execution to AgentContextService', async () => {
    const context = { userProfile: null } as AgentContextDto;
    buildContext.mockResolvedValue(context);

    await expect(tool.execute()).resolves.toBe(context);
    expect(buildContext).toHaveBeenCalledTimes(1);
  });
});
