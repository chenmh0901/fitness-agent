import { WeightTrendDirection, WeightTrendDto } from '../../weight/dto/weight-trend.dto';
import { WeightService } from '../../weight/weight.service';
import { GetWeightTrendTool } from './get-weight-trend.tool';

describe('GetWeightTrendTool', () => {
  const getWeightTrend = jest.fn();
  const weightService = {
    getWeightTrend,
  } as unknown as WeightService;
  const tool = new GetWeightTrendTool(weightService);

  beforeEach(() => {
    getWeightTrend.mockReset();
  });

  it('exposes stable metadata', () => {
    expect(tool.name).toBe('get_weight_trend');
    expect(tool.description).toContain('{"days": 正整数}');
    expect(tool.parameters).toEqual({
      type: 'object',
      properties: {
        days: {
          type: 'number',
          description: '查询最近多少天体重趋势',
        },
      },
      required: ['days'],
    });
  });

  it('validates input and delegates execution to WeightService', async () => {
    const trend: WeightTrendDto = {
      days: 30,
      recordCount: 10,
      averageWeight: 75.2,
      firstWeight: 76,
      latestWeight: 74.8,
      minWeight: 74.8,
      maxWeight: 76,
      weightRange: 1.2,
      volatility: 0.37,
      weeklyAverageChange: -0.3,
      change: -1.2,
      trend: WeightTrendDirection.DECREASING,
    };
    getWeightTrend.mockResolvedValue(trend);

    await expect(tool.execute({ days: 30 })).resolves.toBe(trend);
    expect(getWeightTrend).toHaveBeenCalledWith(30);
  });

  it.each([undefined, null, {}, { days: '7' }, { days: 0 }, { days: 1.5 }])(
    'rejects invalid input %p without calling WeightService',
    async (input) => {
      await expect(tool.execute(input)).rejects.toThrow('input.days must be a positive integer');
      expect(getWeightTrend).not.toHaveBeenCalled();
    },
  );
});
