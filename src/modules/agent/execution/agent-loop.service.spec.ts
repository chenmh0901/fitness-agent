import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AgentContextDto } from '../context/agent-context.dto';
import { AgentContextService } from '../context/agent-context.service';
import { AIMessage, AIProvider, AIToolCallResponse } from '../provider/ai-provider.interface';
import { PromptBuilderService } from '../prompt/prompt-builder.service';
import { AgentTool } from '../tools/agent-tool.interface';
import { ToolRegistryService } from '../tools/tool-registry.service';
import { AgentLoopService, MAX_AGENT_TOOL_CALLS } from './agent-loop.service';

describe('AgentLoopService', () => {
  const buildContext = jest.fn();
  const buildMessages = jest.fn();
  const providerChat = jest.fn();
  const registryGet = jest.fn();
  const toolExecute = jest.fn();
  const configGet = jest.fn();
  const loggerLog = jest.spyOn(Logger.prototype, 'log').mockImplementation();

  const agentContextService = {
    buildContext,
  } as unknown as AgentContextService;
  const promptBuilderService = {
    buildMessages,
  } as unknown as PromptBuilderService;
  const aiProvider = {
    chat: providerChat,
  } as unknown as AIProvider;
  const toolRegistryService = {
    get: registryGet,
  } as unknown as ToolRegistryService;
  const configService = {
    get: configGet,
  } as unknown as ConfigService;
  const tool: AgentTool = {
    name: 'get_daily_context',
    description: 'Get daily context',
    parameters: { type: 'object', properties: {} },
    execute: toolExecute,
  };

  const service = new AgentLoopService(
    agentContextService,
    promptBuilderService,
    aiProvider,
    toolRegistryService,
    configService,
  );
  const context = { userProfile: null } as AgentContextDto;
  const initialMessages: AIMessage[] = [
    { role: 'system', content: 'system prompt' },
    { role: 'user', content: '分析今天状态' },
  ];

  beforeEach(() => {
    buildContext.mockReset();
    buildMessages.mockReset();
    providerChat.mockReset();
    registryGet.mockReset();
    toolExecute.mockReset();
    configGet.mockReset();

    buildContext.mockResolvedValue(context);
    buildMessages.mockReturnValue(initialMessages);
    configGet.mockReturnValue('test');
  });

  afterAll(() => {
    loggerLog.mockRestore();
  });

  it('returns ordinary assistant text without executing a tool', async () => {
    providerChat.mockResolvedValue({
      type: 'text',
      content: '今天状态正常。',
    });

    await expect(service.run('分析今天状态')).resolves.toBe('今天状态正常。');
    expect(buildContext).toHaveBeenCalledTimes(1);
    expect(buildMessages).toHaveBeenCalledWith(context, '分析今天状态');
    expect(providerChat).toHaveBeenCalledWith(initialMessages);
    expect(providerChat).toHaveBeenCalledTimes(1);
    expect(registryGet).not.toHaveBeenCalled();
    expect(toolExecute).not.toHaveBeenCalled();
    expect(loggerLog).not.toHaveBeenCalled();
  });

  it('executes one tool call and returns the following assistant text', async () => {
    const toolArguments = {};
    const toolResult = { weightTrend7Days: { trend: 'stable' } };
    providerChat
      .mockResolvedValueOnce({
        type: 'tool_call',
        toolName: tool.name,
        arguments: toolArguments,
      })
      .mockResolvedValueOnce({
        type: 'text',
        content: '最近体重趋势稳定。',
      });
    registryGet.mockReturnValue(tool);
    toolExecute.mockResolvedValue(toolResult);

    await expect(service.run('分析体重趋势')).resolves.toBe('最近体重趋势稳定。');
    expect(registryGet).toHaveBeenCalledWith(tool.name);
    expect(toolExecute).toHaveBeenCalledWith(toolArguments);
    expect(providerChat).toHaveBeenCalledTimes(2);
    expect(providerChat).toHaveBeenNthCalledWith(2, [
      ...initialMessages,
      {
        role: 'assistant',
        content: '',
        toolName: tool.name,
        arguments: toolArguments,
      },
      {
        role: 'tool',
        toolName: tool.name,
        content: JSON.stringify(toolResult),
      },
    ]);
  });

  it('supports consecutive tool calls before returning final text', async () => {
    const executeDailyContext = jest.fn().mockResolvedValue({ status: 'ready' });
    const executeTodayWorkout = jest.fn().mockResolvedValue({ exercises: [] });
    const dailyContextTool: AgentTool = {
      name: 'get_daily_context',
      description: 'Get daily context',
      parameters: { type: 'object', properties: {} },
      execute: executeDailyContext,
    };
    const todayWorkoutTool: AgentTool = {
      name: 'get_today_workout',
      description: 'Get today workout',
      parameters: { type: 'object', properties: {} },
      execute: executeTodayWorkout,
    };
    providerChat
      .mockResolvedValueOnce({
        type: 'tool_call',
        toolName: dailyContextTool.name,
        arguments: {},
      })
      .mockResolvedValueOnce({
        type: 'tool_call',
        toolName: todayWorkoutTool.name,
        arguments: {},
      })
      .mockResolvedValueOnce({
        type: 'text',
        content: '今天是休息日。',
      });
    registryGet.mockImplementation((name: string) => {
      if (name === dailyContextTool.name) {
        return dailyContextTool;
      }

      if (name === todayWorkoutTool.name) {
        return todayWorkoutTool;
      }

      return undefined;
    });

    await expect(service.run('今天需要训练吗？')).resolves.toBe('今天是休息日。');
    expect(providerChat).toHaveBeenCalledTimes(3);
    expect(executeDailyContext).toHaveBeenCalledWith({});
    expect(executeTodayWorkout).toHaveBeenCalledWith({});
  });

  it('throws before executing a tool call beyond the maximum loop count', async () => {
    const repeatedToolCall: AIToolCallResponse = {
      type: 'tool_call',
      toolName: tool.name,
      arguments: {},
    };
    providerChat.mockResolvedValue(repeatedToolCall);
    registryGet.mockReturnValue(tool);
    toolExecute.mockResolvedValue({});

    await expect(service.run('持续调用工具')).rejects.toThrow(
      `Agent tool call limit exceeded (${MAX_AGENT_TOOL_CALLS})`,
    );
    expect(providerChat).toHaveBeenCalledTimes(MAX_AGENT_TOOL_CALLS + 1);
    expect(toolExecute).toHaveBeenCalledTimes(MAX_AGENT_TOOL_CALLS);
  });

  it('throws when the provider requests an unknown tool', async () => {
    providerChat.mockResolvedValue({
      type: 'tool_call',
      toolName: 'unknown_tool',
      arguments: {},
    });
    registryGet.mockReturnValue(undefined);

    await expect(service.run('调用未知工具')).rejects.toThrow('Unknown agent tool: unknown_tool');
    expect(registryGet).toHaveBeenCalledWith('unknown_tool');
    expect(toolExecute).not.toHaveBeenCalled();
    expect(providerChat).toHaveBeenCalledTimes(1);
  });

  it('logs user input and tool execution details only in development', async () => {
    const toolArguments = { days: 7 };
    const toolResult = { averageWeight: 70.2, trend: 'stable' };
    const weightTrendTool: AgentTool = {
      name: 'get_weight_trend',
      description: 'Get weight trend',
      parameters: {
        type: 'object',
        properties: { days: { type: 'number' } },
        required: ['days'],
      },
      execute: toolExecute,
    };
    configGet.mockReturnValue('development');
    providerChat
      .mockResolvedValueOnce({
        type: 'tool_call',
        toolName: weightTrendTool.name,
        arguments: toolArguments,
      })
      .mockResolvedValueOnce({
        type: 'text',
        content: '最终回答',
      });
    registryGet.mockReturnValue(weightTrendTool);
    toolExecute.mockResolvedValue(toolResult);

    await expect(service.run('查询最近七天体重趋势')).resolves.toBe('最终回答');

    expect(loggerLog).toHaveBeenNthCalledWith(1, 'User input: 查询最近七天体重趋势');
    expect(loggerLog).toHaveBeenNthCalledWith(2, 'Tool name: get_weight_trend');
    expect(loggerLog).toHaveBeenNthCalledWith(3, 'Tool arguments: {"days":7}');
    expect(loggerLog).toHaveBeenNthCalledWith(
      4,
      'Tool result: {"averageWeight":70.2,"trend":"stable"}',
    );
  });
});
