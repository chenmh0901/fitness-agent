import { AgentLoopService } from './execution/agent-loop.service';
import { AgentService } from './agent.service';

describe('AgentService', () => {
  const run = jest.fn();
  const agentLoopService = {
    run,
  } as unknown as AgentLoopService;
  const service = new AgentService(agentLoopService);

  beforeEach(() => {
    run.mockReset();
  });

  it('delegates chat requests to AgentLoopService', async () => {
    run.mockResolvedValue('今天按计划训练胸部。');

    await expect(service.chat('今天练什么？')).resolves.toBe('今天按计划训练胸部。');
    expect(run).toHaveBeenCalledWith('今天练什么？');
  });

  it('propagates AgentLoopService failures', async () => {
    const loopError = new Error('agent loop failed');
    run.mockRejectedValue(loopError);

    await expect(service.chat('分析最近状态')).rejects.toBe(loopError);
  });
});
