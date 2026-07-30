import { apiClient } from './api-client';
import type { AgentChatRequest, AgentChatResponse } from '@/types/agent';

export function sendAgentMessage(message: string): Promise<AgentChatResponse> {
  const request: AgentChatRequest = {
    message,
  };

  return apiClient.post<AgentChatResponse, AgentChatRequest>('/agent/chat', request);
}
