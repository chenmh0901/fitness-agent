export interface AgentTool {
  readonly name: string;
  readonly description: string;
  execute(input?: unknown): Promise<unknown>;
}
