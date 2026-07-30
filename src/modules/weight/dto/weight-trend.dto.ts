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
  minWeight: number | null;
  maxWeight: number | null;
  weightRange: number | null;
  volatility: number | null;
  weeklyAverageChange: number | null;
  change: number | null;
  trend: WeightTrendDirection;
}
