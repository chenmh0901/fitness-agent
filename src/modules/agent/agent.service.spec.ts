import { AgentContextDto } from './context/agent-context.dto';
import { AgentContextService } from './context/agent-context.service';
import { AIMessage, AIProvider } from './provider/ai-provider.interface';
import { PromptBuilderService } from './prompt/prompt-builder.service';
import { AgentService } from './agent.service';

describe('AgentService', () => {
  const buildContext = jest.fn();
  const buildMessages = jest.fn();
  const providerChat = jest.fn();

  const agentContextService = {
    buildContext,
  } as unknown as AgentContextService;
  const promptBuilderService = {
    buildMessages,
  } as unknown as PromptBuilderService;
  const aiProvider = {
    chat: providerChat,
  } as unknown as AIProvider;

  const service = new AgentService(agentContextService, promptBuilderService, aiProvider);
  const context = { userProfile: null } as AgentContextDto;
  const messages: AIMessage[] = [
    { role: 'system', content: 'system prompt' },
    { role: 'user', content: '今天练什么？' },
  ];

  beforeEach(() => {
    buildContext.mockReset();
    buildMessages.mockReset();
    providerChat.mockReset();
  });

  it('builds context before creating messages and calling the provider', async () => {
    buildContext.mockResolvedValue(context);
    buildMessages.mockReturnValue(messages);
    providerChat.mockResolvedValue('今天按计划训练胸部。');

    await service.chat('今天练什么？');

    expect(buildContext).toHaveBeenCalledTimes(1);
    expect(buildMessages).toHaveBeenCalledWith(context, '今天练什么？');
    expect(providerChat).toHaveBeenCalledWith(messages);
    expect(buildContext.mock.invocationCallOrder[0]).toBeLessThan(
      buildMessages.mock.invocationCallOrder[0],
    );
    expect(buildMessages.mock.invocationCallOrder[0]).toBeLessThan(
      providerChat.mock.invocationCallOrder[0],
    );
  });

  it('returns the successful AI provider response unchanged', async () => {
    buildContext.mockResolvedValue(context);
    buildMessages.mockReturnValue(messages);
    providerChat.mockResolvedValue('最近 7 天体重趋势稳定。');

    await expect(service.chat('我的体重趋势怎么样？')).resolves.toBe('最近 7 天体重趋势稳定。');
  });

  it('propagates provider failures without writing fallback state', async () => {
    const providerError = new Error('provider unavailable');
    buildContext.mockResolvedValue(context);
    buildMessages.mockReturnValue(messages);
    providerChat.mockRejectedValue(providerError);

    await expect(service.chat('分析一下最近状态')).rejects.toBe(providerError);
    expect(buildContext).toHaveBeenCalledTimes(1);
    expect(buildMessages).toHaveBeenCalledTimes(1);
    expect(providerChat).toHaveBeenCalledTimes(1);
  });
});
