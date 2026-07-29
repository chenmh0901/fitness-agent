import { Injectable } from '@nestjs/common';
import { AIMessage, AIProvider, AIResponse } from './ai-provider.interface';

@Injectable()
export class UnconfiguredAIProvider implements AIProvider {
  chat(messages: readonly AIMessage[]): Promise<AIResponse> {
    void messages;

    return Promise.reject(new Error('AI provider is not configured'));
  }
}
