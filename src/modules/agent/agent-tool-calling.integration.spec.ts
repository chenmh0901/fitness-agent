import { ConfigService } from '@nestjs/config';
import { WeightTrendDirection, WeightTrendDto } from '../weight/dto/weight-trend.dto';
import { WeightService } from '../weight/weight.service';
import { AgentContextDto } from './context/agent-context.dto';
import { AgentContextService } from './context/agent-context.service';
import { AgentLoopService } from './execution/agent-loop.service';
import { AIMessage, AIProvider } from './provider/ai-provider.interface';
import { PromptBuilderService } from './prompt/prompt-builder.service';
import { GetWeightTrendTool } from './tools/get-weight-trend.tool';
import { ToolRegistryService } from './tools/tool-registry.service';
import { ToolSchemaBuilderService } from './tools/tool-schema-builder.service';
import { AgentService } from './agent.service';

describe('Agent tool calling integration', () => {
  it('returns final text after AgentService executes a requested read-only tool', async () => {
    const context = { userProfile: null } as AgentContextDto;
    const initialMessages: AIMessage[] = [
      { role: 'system', content: 'system prompt' },
      { role: 'user', content: '查询最近七天体重趋势' },
    ];
    const trend: WeightTrendDto = {
      days: 7,
      recordCount: 7,
      averageWeight: 70.2,
      firstWeight: 70.5,
      latestWeight: 70,
      change: -0.5,
      trend: WeightTrendDirection.DECREASING,
    };
    const buildContext = jest.fn().mockResolvedValue(context);
    const buildMessages = jest.fn().mockReturnValue(initialMessages);
    const providerChat = jest
      .fn()
      .mockResolvedValueOnce({
        type: 'tool_call',
        toolName: 'get_weight_trend',
        arguments: { days: 7 },
      })
      .mockResolvedValueOnce({
        type: 'text',
        content: '最终回答',
      });
    const getWeightTrend = jest.fn().mockResolvedValue(trend);
    const agentContextService = {
      buildContext,
    } as unknown as AgentContextService;
    const promptBuilderService = {
      buildMessages,
    } as unknown as PromptBuilderService;
    const aiProvider = {
      chat: providerChat,
    } as unknown as AIProvider;
    const weightService = {
      getWeightTrend,
    } as unknown as WeightService;
    const configService = {
      get: jest.fn().mockReturnValue('test'),
    } as unknown as ConfigService;
    const registry = new ToolRegistryService(new ToolSchemaBuilderService());
    registry.register(new GetWeightTrendTool(weightService));
    const loop = new AgentLoopService(
      agentContextService,
      promptBuilderService,
      aiProvider,
      registry,
      configService,
    );
    const agentService = new AgentService(loop);

    await expect(agentService.chat('查询最近七天体重趋势')).resolves.toBe('最终回答');
    expect(getWeightTrend).toHaveBeenCalledWith(7);
    expect(providerChat).toHaveBeenCalledTimes(2);
    expect(providerChat).toHaveBeenNthCalledWith(2, [
      ...initialMessages,
      {
        role: 'assistant',
        content: '',
        toolName: 'get_weight_trend',
        arguments: { days: 7 },
      },
      {
        role: 'tool',
        toolName: 'get_weight_trend',
        content: JSON.stringify(trend),
      },
    ]);
  });
});
