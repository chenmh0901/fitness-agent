import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { ToolRegistryService } from '../tools/tool-registry.service';
import { AI_PROVIDER_FACTORY_PROVIDER, AIProviderName } from './ai-provider.factory';
import { AIProvider } from './ai-provider.interface';
import { AI_PROVIDER } from './ai-provider.token';
import { DeepSeekAIProvider } from './deepseek/deepseek-ai.provider';
import { OpenAIAIProvider } from './openai/openai-ai.provider';

describe('AI_PROVIDER_FACTORY_PROVIDER', () => {
  const toolRegistryService = {
    getDefinitions: jest.fn().mockReturnValue([]),
  } as unknown as ToolRegistryService;

  async function resolveProvider(providerName?: AIProviderName): Promise<AIProvider> {
    const values: Record<string, string | undefined> = {
      AI_PROVIDER: providerName,
      DEEPSEEK_API_KEY: 'deepseek-test-key',
      DEEPSEEK_MODEL: 'deepseek-chat',
      OPENAI_API_KEY: 'openai-test-key',
      OPENAI_MODEL: 'gpt-4.1-mini',
    };
    const configService = {
      get: jest.fn(
        (key: string, defaultValue?: string): string | undefined => values[key] ?? defaultValue,
      ),
      getOrThrow: jest.fn((key: string): string => {
        const value = values[key];

        if (!value) {
          throw new Error(`Missing ${key}`);
        }

        return value;
      }),
    } as unknown as ConfigService;
    const moduleRef = await Test.createTestingModule({
      providers: [
        AI_PROVIDER_FACTORY_PROVIDER,
        {
          provide: ConfigService,
          useValue: configService,
        },
        {
          provide: ToolRegistryService,
          useValue: toolRegistryService,
        },
      ],
    }).compile();

    return moduleRef.get<AIProvider>(AI_PROVIDER);
  }

  it('injects DeepSeekAIProvider when AI_PROVIDER is deepseek', async () => {
    await expect(resolveProvider('deepseek')).resolves.toBeInstanceOf(DeepSeekAIProvider);
  });

  it('injects OpenAIAIProvider when AI_PROVIDER is openai', async () => {
    await expect(resolveProvider('openai')).resolves.toBeInstanceOf(OpenAIAIProvider);
  });

  it('defaults to DeepSeekAIProvider when AI_PROVIDER is omitted', async () => {
    await expect(resolveProvider()).resolves.toBeInstanceOf(DeepSeekAIProvider);
  });
});
