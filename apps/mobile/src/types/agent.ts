export interface AgentChatRequest {
  message: string;
}

export interface AgentChatResponse {
  answer: string;
}

export type ChatMessageRole = 'user' | 'agent';

export interface ChatMessageItem {
  id: string;
  role: ChatMessageRole;
  content: string;
}
