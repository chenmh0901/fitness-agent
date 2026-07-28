export enum WeightTrendDirection {
  INSUFFICIENT_DATA = 'insufficient_data',
  DECREASING = 'decreasing',
  STABLE = 'stable',
  INCREASING = 'increasing',
}

export class WeightTrendDto {
  days: number;
  recordCount: number;
  averageWeight: number | null;
  firstWeight: number | null;
  latestWeight: number | null;
  change: number | null;
  trend: WeightTrendDirection;
}
