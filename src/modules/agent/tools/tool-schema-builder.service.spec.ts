import { AgentTool } from './agent-tool.interface';
import { ToolSchemaBuilderService } from './tool-schema-builder.service';

describe('ToolSchemaBuilderService', () => {
  const service = new ToolSchemaBuilderService();

  it('converts internal tools to OpenAI function tool definitions', () => {
    const tool: AgentTool = {
      name: 'get_weight_trend',
      description: '获取最近体重趋势',
      parameters: {
        type: 'object',
        properties: {
          days: {
            type: 'number',
            description: '查询最近多少天体重趋势',
          },
        },
        required: ['days'],
      },
      execute: jest.fn(),
    };

    expect(service.build([tool])).toEqual([
      {
        type: 'function',
        function: {
          name: 'get_weight_trend',
          description: '获取最近体重趋势',
          parameters: {
            type: 'object',
            properties: {
              days: {
                type: 'number',
                description: '查询最近多少天体重趋势',
              },
            },
            required: ['days'],
          },
        },
      },
    ]);
  });

  it('returns an empty definition list for an empty tool list', () => {
    expect(service.build([])).toEqual([]);
  });
});
