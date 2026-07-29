import { SleepStatus } from '../../sleep/dto/sleep-summary.dto';
import { SleepService } from '../../sleep/sleep.service';
import { UserProfileService } from '../../user/user-profile.service';
import { WeightTrendDirection } from '../../weight/dto/weight-trend.dto';
import { WeightService } from '../../weight/weight.service';
import { WorkoutService } from '../../workout/workout.service';
import { DailyFitnessService } from './daily-fitness.service';

describe('DailyFitnessService', () => {
  const getProfile = jest.fn();
  const getWeightTrend = jest.fn();
  const getRecentSleep = jest.fn();
  const getTodayWorkout = jest.fn();
  const getRecentExercisePerformance = jest.fn();

  const userProfileService = {
    getProfile,
  } as unknown as UserProfileService;
  const weightService = {
    getWeightTrend,
  } as unknown as WeightService;
  const sleepService = {
    getRecentSleep,
  } as unknown as SleepService;
  const workoutService = {
    getTodayWorkout,
    getRecentExercisePerformance,
  } as unknown as WorkoutService;

  const service = new DailyFitnessService(
    userProfileService,
    weightService,
    sleepService,
    workoutService,
  );

  beforeEach(() => {
    getProfile.mockReset();
    getWeightTrend.mockReset();
    getRecentSleep.mockReset();
    getTodayWorkout.mockReset();
    getRecentExercisePerformance.mockReset();
  });

  it('aggregates the daily fitness data into a stable summary DTO', async () => {
    const currentDate = new Date(2026, 6, 29, 16, 30);
    const userProfile = {
      id: 'profile-id',
      currentWeight: 90.5,
      trainingExperience: 'INTERMEDIATE',
    };
    const todayWorkout = {
      date: new Date(2026, 6, 29),
      exercises: [{ id: 'plan-id', exerciseName: 'barbell bench press' }],
    };
    const weightSummary = {
      days: 7,
      recordCount: 7,
      averageWeight: 90.8,
      firstWeight: 91.2,
      latestWeight: 90.5,
      change: -0.7,
      trend: WeightTrendDirection.DECREASING,
    };
    const sleepSummary = {
      days: 7,
      recordCount: 6,
      recentSleep: [],
      averageDurationMinutes: 425,
      averageQuality: 3.5,
      status: SleepStatus.GOOD,
    };
    const recentExercisePerformance = [
      {
        id: 'exercise-record-id',
        exerciseName: 'barbell bench press',
        actualWeight: 80,
      },
    ];

    getProfile.mockResolvedValue(userProfile);
    getTodayWorkout.mockResolvedValue(todayWorkout);
    getWeightTrend.mockResolvedValue(weightSummary);
    getRecentSleep.mockResolvedValue(sleepSummary);
    getRecentExercisePerformance.mockResolvedValue(recentExercisePerformance);

    await expect(service.getDailySummary(currentDate)).resolves.toEqual({
      date: new Date(2026, 6, 29),
      weightSummary,
      sleepSummary,
      todayWorkout,
      recommendationsContext: {
        userProfile,
        recentExercisePerformance,
      },
    });
    expect(getProfile).toHaveBeenCalledTimes(1);
    expect(getTodayWorkout).toHaveBeenCalledTimes(1);
    expect(getWeightTrend).toHaveBeenCalledWith(7);
    expect(getRecentSleep).toHaveBeenCalledWith(7);
    expect(getRecentExercisePerformance).toHaveBeenCalledTimes(1);
  });

  it('preserves missing and empty source data without generating recommendations', async () => {
    const weightSummary = {
      days: 7,
      recordCount: 0,
      averageWeight: null,
      firstWeight: null,
      latestWeight: null,
      change: null,
      trend: WeightTrendDirection.INSUFFICIENT_DATA,
    };
    const sleepSummary = {
      days: 7,
      recordCount: 0,
      recentSleep: [],
      averageDurationMinutes: null,
      averageQuality: null,
      status: SleepStatus.NO_DATA,
    };

    getProfile.mockResolvedValue(null);
    getTodayWorkout.mockResolvedValue(null);
    getWeightTrend.mockResolvedValue(weightSummary);
    getRecentSleep.mockResolvedValue(sleepSummary);
    getRecentExercisePerformance.mockResolvedValue([]);

    await expect(service.getDailySummary(new Date(2026, 6, 29))).resolves.toEqual({
      date: new Date(2026, 6, 29),
      weightSummary,
      sleepSummary,
      todayWorkout: null,
      recommendationsContext: {
        userProfile: null,
        recentExercisePerformance: [],
      },
    });
  });

  it('rejects an invalid date before reading any data source', async () => {
    await expect(service.getDailySummary(new Date('invalid'))).rejects.toThrow(
      'currentDate must be a valid Date',
    );
    expect(getProfile).not.toHaveBeenCalled();
    expect(getTodayWorkout).not.toHaveBeenCalled();
    expect(getWeightTrend).not.toHaveBeenCalled();
    expect(getRecentSleep).not.toHaveBeenCalled();
    expect(getRecentExercisePerformance).not.toHaveBeenCalled();
  });
});
