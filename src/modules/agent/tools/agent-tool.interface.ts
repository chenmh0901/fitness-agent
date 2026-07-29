export type JsonSchemaValue =
  string | number | boolean | null | JsonSchema | readonly JsonSchemaValue[];

export interface JsonSchema {
  readonly [keyword: string]: JsonSchemaValue;
}

export interface AgentTool {
  readonly name: string;
  readonly description: string;
  readonly parameters: JsonSchema;
  execute(input?: unknown): Promise<unknown>;
}
