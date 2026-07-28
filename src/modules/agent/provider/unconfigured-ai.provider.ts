import { Injectable } from '@nestjs/common';
import { AIMessage, AIProvider } from './ai-provider.interface';

@Injectable()
export class UnconfiguredAIProvider implements AIProvider {
  chat(messages: readonly AIMessage[]): Promise<string> {
    void messages;

    return Promise.reject(new Error('AI provider is not configured'));
  }
}
