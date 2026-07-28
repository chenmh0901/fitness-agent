export type AIMessageRole = 'system' | 'user' | 'assistant';

export interface AIMessage {
  readonly role: AIMessageRole;
  readonly content: string;
}

export interface AIProvider {
  chat(messages: readonly AIMessage[]): Promise<string>;
}
