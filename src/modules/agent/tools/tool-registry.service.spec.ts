import { AgentTool } from './agent-tool.interface';
import { ToolRegistryService } from './tool-registry.service';
import { ToolSchemaBuilderService } from './tool-schema-builder.service';

describe('ToolRegistryService', () => {
  const createTool = (name: string): AgentTool => ({
    name,
    description: `${name} description`,
    parameters: {
      type: 'object',
      properties: {},
    },
    execute: jest.fn(),
  });
  const createRegistry = (): ToolRegistryService =>
    new ToolRegistryService(new ToolSchemaBuilderService());

  it('registers tools and queries them by name', () => {
    const registry = createRegistry();
    const dailyContextTool = createTool('get_daily_context');
    const weightTrendTool = createTool('get_weight_trend');

    registry.register(dailyContextTool);
    registry.register(weightTrendTool);

    expect(registry.get('get_daily_context')).toBe(dailyContextTool);
    expect(registry.get('get_weight_trend')).toBe(weightTrendTool);
    expect(registry.get('missing_tool')).toBeUndefined();
    expect(registry.getAll()).toEqual([dailyContextTool, weightTrendTool]);
  });

  it('rejects duplicate tool names', () => {
    const registry = createRegistry();
    registry.register(createTool('get_daily_context'));

    expect(() => registry.register(createTool('get_daily_context'))).toThrow(
      'Agent tool "get_daily_context" is already registered',
    );
  });

  it('rejects empty tool names', () => {
    const registry = createRegistry();

    expect(() => registry.register(createTool('   '))).toThrow('Agent tool name must not be empty');
  });

  it('returns OpenAI definitions for every registered tool', () => {
    const registry = createRegistry();
    const dailyContextTool = createTool('get_daily_context');
    const todayWorkoutTool = createTool('get_today_workout');
    registry.register(dailyContextTool);
    registry.register(todayWorkoutTool);

    expect(registry.getDefinitions()).toEqual([
      {
        type: 'function',
        function: {
          name: dailyContextTool.name,
          description: dailyContextTool.description,
          parameters: dailyContextTool.parameters,
        },
      },
      {
        type: 'function',
        function: {
          name: todayWorkoutTool.name,
          description: todayWorkoutTool.description,
          parameters: todayWorkoutTool.parameters,
        },
      },
    ]);
  });
});
