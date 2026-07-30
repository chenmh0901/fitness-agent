import { SleepStatus } from '../../sleep/dto/sleep-summary.dto';
import { WeightTrendDirection } from '../../weight/dto/weight-trend.dto';
import { DailyFitnessService } from './daily-fitness.service';
import { DailyFitnessSummaryDto } from './daily-fitness-summary.dto';
import { DailyFitnessController } from './daily-fitness.controller';

describe('DailyFitnessController', () => {
  const getTodaySummary = jest.fn();
  const dailyFitnessService = {
    getTodaySummary,
  } as unknown as DailyFitnessService;
  const controller = new DailyFitnessController(dailyFitnessService);

  beforeEach(() => {
    getTodaySummary.mockReset();
  });

  it('returns the summary from DailyFitnessService without transforming it', async () => {
    const summary: DailyFitnessSummaryDto = {
      localDate: '2026-07-30',
      generatedAt: '2026-07-30T04:00:00.000Z',
      weightSummary: {
        days: 7,
        recordCount: 0,
        averageWeight: null,
        firstWeight: null,
        latestWeight: null,
        minWeight: null,
        maxWeight: null,
        weightRange: null,
        volatility: null,
        weeklyAverageChange: null,
        change: null,
        trend: WeightTrendDirection.INSUFFICIENT_DATA,
      },
      sleepSummary: {
        days: 7,
        recordCount: 0,
        recentSleep: [],
        averageDurationMinutes: null,
        averageQuality: null,
        status: SleepStatus.NO_DATA,
      },
      todayWorkout: null,
      recommendationsContext: {
        userProfile: null,
        recentExercisePerformance: [],
      },
    };
    getTodaySummary.mockResolvedValue(summary);

    await expect(controller.getToday()).resolves.toBe(summary);
    expect(getTodaySummary).toHaveBeenCalledTimes(1);
  });
});
