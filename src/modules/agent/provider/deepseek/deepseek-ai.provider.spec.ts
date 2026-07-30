import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { ToolRegistryService } from '../../tools/tool-registry.service';
import { DeepSeekAIProvider, DeepSeekProviderError } from './deepseek-ai.provider';

describe('DeepSeekAIProvider', () => {
  const createCompletion = jest.fn();
  const configValues: Record<string, string> = {
    DEEPSEEK_API_KEY: 'test-deepseek-key',
    DEEPSEEK_MODEL: 'deepseek-v4-flash',
  };
  const configService = {
    get: jest.fn((key: string): string | undefined => configValues[key]),
  } as unknown as ConfigService;
  const client = {
    chat: {
      completions: {
        create: createCompletion,
      },
    },
  } as unknown as OpenAI;
  const toolDefinitions = [
    {
      type: 'function' as const,
      function: {
        name: 'get_weight_trend',
        description: '获取最近体重趋势',
        parameters: {
          type: 'object',
          properties: {
            days: {
              type: 'number',
              description: '查询最近多少天体重趋势',
            },
          },
          required: ['days'],
        },
      },
    },
  ];
  const getDefinitions = jest.fn(() => toolDefinitions);
  const toolRegistryService = {
    getDefinitions,
  } as unknown as ToolRegistryService;

  let provider: DeepSeekAIProvider;

  beforeEach(() => {
    provider = new DeepSeekAIProvider(configService, toolRegistryService, client);
  });

  it('sends a minimal request and returns a text response when no tools are registered', async () => {
    getDefinitions.mockReturnValueOnce([]);
    createCompletion.mockResolvedValue({
      choices: [
        {
          message: {
            role: 'assistant',
            content: '今天按计划训练即可。',
            refusal: null,
          },
        },
      ],
    });

    await expect(
      provider.chat([
        { role: 'system', content: 'You are a fitness assistant.' },
        { role: 'user', content: '今天练什么？' },
      ]),
    ).resolves.toEqual({
      type: 'text',
      content: '今天按计划训练即可。',
    });
    expect(createCompletion).toHaveBeenCalledWith({
      model: 'deepseek-v4-flash',
      messages: [
        { role: 'system', content: 'You are a fitness assistant.' },
        { role: 'user', content: '今天练什么？' },
      ],
    });
  });

  it('sends DeepSeek-compatible tool schemas when tools are available', async () => {
    createCompletion.mockResolvedValue({
      choices: [
        {
          message: {
            role: 'assistant',
            content: '我是你的个人健身助手。',
            refusal: null,
          },
        },
      ],
    });

    await expect(provider.chat([{ role: 'user', content: '介绍一下自己' }])).resolves.toEqual({
      type: 'text',
      content: '我是你的个人健身助手。',
    });
    expect(createCompletion).toHaveBeenCalledWith({
      model: 'deepseek-v4-flash',
      messages: [{ role: 'user', content: '介绍一下自己' }],
      tools: [
        {
          type: 'function',
          function: {
            name: 'get_weight_trend',
            description: '获取最近体重趋势',
            parameters: {
              type: 'object',
              properties: {
                days: {
                  type: 'integer',
                  description: '查询最近多少天体重趋势',
                },
              },
              required: ['days'],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: 'auto',
      parallel_tool_calls: false,
    });
  });

  it('converts a DeepSeek function call into a provider-neutral tool call', async () => {
    createCompletion.mockResolvedValue({
      choices: [
        {
          message: {
            role: 'assistant',
            content: null,
            refusal: null,
            tool_calls: [
              {
                id: 'deepseek_call_1',
                type: 'function',
                function: {
                  name: 'get_weight_trend',
                  arguments: '{"days":7}',
                },
              },
            ],
          },
        },
      ],
    });

    await expect(
      provider.chat([{ role: 'user', content: '分析一下我最近7天减脂情况' }]),
    ).resolves.toEqual({
      type: 'tool_call',
      toolName: 'get_weight_trend',
      arguments: {
        days: 7,
      },
    });
  });

  it('replays the original tool call id and reasoning content in the next loop request', async () => {
    createCompletion
      .mockResolvedValueOnce({
        choices: [
          {
            message: {
              role: 'assistant',
              content: null,
              refusal: null,
              reasoning_content: 'I should inspect the seven-day trend.',
              tool_calls: [
                {
                  id: 'call_00_deepseek_original',
                  type: 'function',
                  function: {
                    name: 'get_weight_trend',
                    arguments: '{"days": 7}',
                  },
                },
              ],
            },
          },
        ],
      })
      .mockResolvedValueOnce({
        choices: [
          {
            message: {
              role: 'assistant',
              content: '最近7天体重趋势平稳。',
              refusal: null,
            },
          },
        ],
      });

    const firstResponse = await provider.chat([
      { role: 'user', content: '分析一下我最近7天减脂情况' },
    ]);

    expect(firstResponse).toEqual({
      type: 'tool_call',
      toolName: 'get_weight_trend',
      arguments: { days: 7 },
    });

    await expect(
      provider.chat([
        { role: 'user', content: '分析一下我最近7天减脂情况' },
        {
          role: 'assistant',
          content: '',
          toolName: 'get_weight_trend',
          arguments: { days: 7 },
        },
        {
          role: 'tool',
          toolName: 'get_weight_trend',
          content: '{"averageWeight":91.2}',
        },
      ]),
    ).resolves.toEqual({
      type: 'text',
      content: '最近7天体重趋势平稳。',
    });

    expect(createCompletion).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        messages: [
          { role: 'user', content: '分析一下我最近7天减脂情况' },
          {
            role: 'assistant',
            content: null,
            reasoning_content: 'I should inspect the seven-day trend.',
            tool_calls: [
              {
                id: 'call_00_deepseek_original',
                type: 'function',
                function: {
                  name: 'get_weight_trend',
                  arguments: '{"days": 7}',
                },
              },
            ],
          },
          {
            role: 'tool',
            tool_call_id: 'call_00_deepseek_original',
            content: '{"averageWeight":91.2}',
          },
        ],
      }),
    );
  });

  it('logs a sanitized API 400 response and preserves useful error details', async () => {
    const loggerError = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    const sdkError = new OpenAI.APIError(
      400,
      {
        message: 'The model name must be lowercase.',
        type: 'invalid_request_error',
        api_key: 'sk-sensitive-secret',
      },
      'The model name must be lowercase.',
      new Headers(),
    );
    createCompletion.mockRejectedValue(sdkError);

    let caughtError: unknown;

    try {
      await provider.chat([{ role: 'user', content: '今天练什么？' }]);
    } catch (error: unknown) {
      caughtError = error;
    }

    expect(caughtError).toBeInstanceOf(DeepSeekProviderError);

    if (!(caughtError instanceof DeepSeekProviderError)) {
      throw new Error('Expected DeepSeekProviderError');
    }

    expect(caughtError.message).toContain(
      'DeepSeek API request failed (status: 400): 400 The model name must be lowercase.',
    );
    expect(caughtError.cause).toBe(sdkError);

    const loggedDiagnostic = loggerError.mock.calls.flat().join(' ');

    expect(loggedDiagnostic).toContain('"status":400');
    expect(loggedDiagnostic).toContain('The model name must be lowercase.');
    expect(loggedDiagnostic).toContain('"responseBody"');
    expect(loggedDiagnostic).toContain('[REDACTED]');
    expect(loggedDiagnostic).not.toContain('sk-sensitive-secret');
    loggerError.mockRestore();
  });

  it('returns an explicit error when DEEPSEEK_API_KEY is not configured', async () => {
    const unconfiguredProvider = new DeepSeekAIProvider(
      {
        get: jest.fn().mockReturnValue(undefined),
      } as unknown as ConfigService,
      toolRegistryService,
    );

    await expect(
      unconfiguredProvider.chat([{ role: 'user', content: '今天练什么？' }]),
    ).rejects.toMatchObject({
      name: 'DeepSeekProviderError',
      message: 'DeepSeek provider is not configured: DEEPSEEK_API_KEY is missing',
    });
    expect(createCompletion).not.toHaveBeenCalled();
  });

  it('rejects invalid JSON tool arguments', async () => {
    createCompletion.mockResolvedValue({
      choices: [
        {
          message: {
            role: 'assistant',
            content: null,
            refusal: null,
            tool_calls: [
              {
                id: 'deepseek_call_1',
                type: 'function',
                function: {
                  name: 'get_weight_trend',
                  arguments: '{invalid',
                },
              },
            ],
          },
        },
      ],
    });

    await expect(
      provider.chat([{ role: 'user', content: '最近体重趋势如何？' }]),
    ).rejects.toBeInstanceOf(DeepSeekProviderError);
    await expect(provider.chat([{ role: 'user', content: '最近体重趋势如何？' }])).rejects.toThrow(
      'DeepSeek returned invalid JSON tool arguments',
    );
  });
});
