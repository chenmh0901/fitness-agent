import { AgentTool } from './agent-tool.interface';
import { ToolRegistryService } from './tool-registry.service';

describe('ToolRegistryService', () => {
  const createTool = (name: string): AgentTool => ({
    name,
    description: `${name} description`,
    execute: jest.fn(),
  });

  it('registers tools and queries them by name', () => {
    const registry = new ToolRegistryService();
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
    const registry = new ToolRegistryService();
    registry.register(createTool('get_daily_context'));

    expect(() => registry.register(createTool('get_daily_context'))).toThrow(
      'Agent tool "get_daily_context" is already registered',
    );
  });

  it('rejects empty tool names', () => {
    const registry = new ToolRegistryService();

    expect(() => registry.register(createTool('   '))).toThrow('Agent tool name must not be empty');
  });
});
