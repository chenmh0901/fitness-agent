import { AgentService } from './agent.service';
import { AgentController } from './agent.controller';

describe('AgentController', () => {
  const chat = jest.fn();
  const agentService = {
    chat,
  } as unknown as AgentService;
  const controller = new AgentController(agentService);

  beforeEach(() => {
    chat.mockReset();
  });

  it('delegates the validated message to AgentService and wraps the answer', async () => {
    chat.mockResolvedValue('已记录今天的晨起体重为90.5kg。');

    await expect(controller.chat({ message: '今天早上90.5kg' })).resolves.toEqual({
      answer: '已记录今天的晨起体重为90.5kg。',
    });
    expect(chat).toHaveBeenCalledWith('今天早上90.5kg');
    expect(chat).toHaveBeenCalledTimes(1);
  });

  it('does not translate service errors inside the controller', async () => {
    const error = new Error('provider failed');
    chat.mockRejectedValue(error);

    await expect(controller.chat({ message: '测试消息' })).rejects.toBe(error);
  });
});
