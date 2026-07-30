import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { ToolRegistryService } from '../../tools/tool-registry.service';
import { OpenAIAIProvider, OpenAIProviderError } from './openai-ai.provider';

describe('OpenAIAIProvider', () => {
  const createCompletion = jest.fn();
  const configValues = {
    OPENAI_API_KEY: 'test-api-key',
    OPENAI_MODEL: 'test-model',
  };
  const configService = {
    get: jest.fn((key: keyof typeof configValues): string => configValues[key]),
    getOrThrow: jest.fn((key: keyof typeof configValues): string => configValues[key]),
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
            days: { type: 'number' },
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

  let provider: OpenAIAIProvider;

  beforeEach(() => {
    provider = new OpenAIAIProvider(configService, toolRegistryService, client);
  });

  it('defers a missing API key error until chat is called', async () => {
    const unconfiguredConfigService = {
      get: jest.fn().mockReturnValue(undefined),
      getOrThrow: jest.fn().mockReturnValue('test-model'),
    } as unknown as ConfigService;
    const unconfiguredProvider = new OpenAIAIProvider(
      unconfiguredConfigService,
      toolRegistryService,
    );

    await expect(
      unconfiguredProvider.chat([{ role: 'user', content: '今天练什么？' }]),
    ).rejects.toMatchObject({
      name: 'OpenAIProviderError',
      message: 'OpenAI provider is not configured: OPENAI_API_KEY is missing',
    });
    expect(createCompletion).not.toHaveBeenCalled();
  });

  it('maps text messages and returns an AI text response', async () => {
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
      model: 'test-model',
      messages: [
        { role: 'system', content: 'You are a fitness assistant.' },
        { role: 'user', content: '今天练什么？' },
      ],
      tools: toolDefinitions,
      tool_choice: 'auto',
      parallel_tool_calls: false,
    });
  });

  it('converts an OpenAI function tool call into the provider response', async () => {
    createCompletion.mockResolvedValue({
      choices: [
        {
          message: {
            role: 'assistant',
            content: null,
            refusal: null,
            tool_calls: [
              {
                id: 'call_from_openai',
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

    await expect(provider.chat([{ role: 'user', content: '最近体重趋势如何？' }])).resolves.toEqual(
      {
        type: 'tool_call',
        toolName: 'get_weight_trend',
        arguments: { days: 7 },
      },
    );
    expect(createCompletion).toHaveBeenCalledWith(
      expect.objectContaining({
        tools: toolDefinitions,
        tool_choice: 'auto',
        parallel_tool_calls: false,
      }),
    );
  });

  it('omits the OpenAI tools field when the registry is empty', async () => {
    getDefinitions.mockReturnValueOnce([]);
    createCompletion.mockResolvedValue({
      choices: [
        {
          message: {
            role: 'assistant',
            content: '没有可用工具。',
            refusal: null,
          },
        },
      ],
    });

    await provider.chat([{ role: 'user', content: '有哪些工具？' }]);

    expect(createCompletion).toHaveBeenCalledWith({
      model: 'test-model',
      messages: [{ role: 'user', content: '有哪些工具？' }],
    });
  });

  it('maps agent tool history to OpenAI tool call messages', async () => {
    createCompletion.mockResolvedValue({
      choices: [
        {
          message: {
            role: 'assistant',
            content: '你的七日均重为 70.2kg。',
            refusal: null,
          },
        },
      ],
    });

    await provider.chat([
      { role: 'user', content: '最近体重趋势如何？' },
      {
        role: 'assistant',
        content: '',
        toolName: 'get_weight_trend',
        arguments: { days: 7 },
      },
      {
        role: 'tool',
        content: '{"average":70.2}',
        toolName: 'get_weight_trend',
      },
    ]);

    expect(createCompletion).toHaveBeenCalledWith({
      model: 'test-model',
      messages: [
        { role: 'user', content: '最近体重趋势如何？' },
        {
          role: 'assistant',
          content: null,
          tool_calls: [
            {
              id: 'call_1',
              type: 'function',
              function: {
                name: 'get_weight_trend',
                arguments: '{"days":7}',
              },
            },
          ],
        },
        {
          role: 'tool',
          tool_call_id: 'call_1',
          content: '{"average":70.2}',
        },
      ],
      tools: toolDefinitions,
      tool_choice: 'auto',
      parallel_tool_calls: false,
    });
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
                id: 'call_from_openai',
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

    await expect(provider.chat([{ role: 'user', content: '最近体重趋势如何？' }])).rejects.toThrow(
      'OpenAI returned invalid JSON tool arguments',
    );
  });

  it('wraps OpenAI API failures without exposing the SDK error message', async () => {
    const sdkError = new OpenAI.APIError(429, {}, 'sensitive upstream details', new Headers());
    createCompletion.mockRejectedValue(sdkError);

    await expect(provider.chat([{ role: 'user', content: '今天练什么？' }])).rejects.toMatchObject({
      name: 'OpenAIProviderError',
      message: 'OpenAI API request failed (status: 429)',
      cause: sdkError,
    });
  });

  it('rejects a completion without choices', async () => {
    createCompletion.mockResolvedValue({ choices: [] });

    await expect(provider.chat([{ role: 'user', content: '今天练什么？' }])).rejects.toBeInstanceOf(
      OpenAIProviderError,
    );
    await expect(provider.chat([{ role: 'user', content: '今天练什么？' }])).rejects.toThrow(
      'OpenAI returned no completion choices',
    );
  });
});
