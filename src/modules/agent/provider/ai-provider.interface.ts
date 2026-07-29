export type AIMessageRole = 'system' | 'user' | 'assistant' | 'tool';
export type AIToolArguments = Readonly<Record<string, unknown>>;

export interface AIMessage {
  readonly role: AIMessageRole;
  readonly content: string;
  readonly toolName?: string;
  readonly arguments?: AIToolArguments;
}

export interface AITextResponse {
  readonly type: 'text';
  readonly content: string;
}

export interface AIToolCallResponse {
  readonly type: 'tool_call';
  readonly toolName: string;
  readonly arguments: AIToolArguments;
}

export type AIResponse = AITextResponse | AIToolCallResponse;

export interface AIProvider {
  chat(messages: readonly AIMessage[]): Promise<AIResponse>;
}
