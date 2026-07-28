import { Injectable } from '@nestjs/common';
import { assertPositiveInteger } from '../../../common/utils/date.util';
import { WeightTrendDto } from '../../weight/dto/weight-trend.dto';
import { WeightService } from '../../weight/weight.service';
import { AgentTool } from './agent-tool.interface';

export interface GetWeightTrendToolInput {
  days: number;
}

@Injectable()
export class GetWeightTrendTool implements AgentTool {
  readonly name = 'get_weight_trend';
  readonly description =
    '获取指定最近天数的早晨体重趋势，返回平均体重、变化量和趋势方向。输入格式：{"days": 正整数}。';

  constructor(private readonly weightService: WeightService) {}

  async execute(input?: unknown): Promise<WeightTrendDto> {
    const days = this.getDays(input);

    return this.weightService.getWeightTrend(days);
  }

  private getDays(input: unknown): number {
    if (typeof input !== 'object' || input === null || !('days' in input)) {
      throw new TypeError('input.days must be a positive integer');
    }

    const days = input.days;

    if (typeof days !== 'number') {
      throw new TypeError('input.days must be a positive integer');
    }

    assertPositiveInteger(days, 'input.days');

    return days;
  }
}
