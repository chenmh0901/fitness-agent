import { FactoryProvider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ToolRegistryService } from '../tools/tool-registry.service';
import { AIProvider } from './ai-provider.interface';
import { AI_PROVIDER } from './ai-provider.token';
import { DeepSeekAIProvider } from './deepseek/deepseek-ai.provider';
import { OpenAIAIProvider } from './openai/openai-ai.provider';

export type AIProviderName = 'deepseek' | 'openai';

export const AI_PROVIDER_FACTORY_PROVIDER: FactoryProvider<AIProvider> = {
  provide: AI_PROVIDER,
  inject: [ConfigService, ToolRegistryService],
  useFactory: (
    configService: ConfigService,
    toolRegistryService: ToolRegistryService,
  ): AIProvider => {
    const providerName = configService.get<AIProviderName>('AI_PROVIDER', 'deepseek');

    if (providerName === 'deepseek') {
      return new DeepSeekAIProvider(configService, toolRegistryService);
    }

    if (providerName === 'openai') {
      return new OpenAIAIProvider(configService, toolRegistryService);
    }

    throw new TypeError(`Unsupported AI_PROVIDER: ${String(providerName)}`);
  },
};
