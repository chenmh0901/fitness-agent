import { SleepStatus } from '../../sleep/dto/sleep-summary.dto';
import { SleepService } from '../../sleep/sleep.service';
import { UserProfileService } from '../../user/user-profile.service';
import { WeightTrendDirection } from '../../weight/dto/weight-trend.dto';
import { WeightService } from '../../weight/weight.service';
import { WorkoutService } from '../../workout/workout.service';
import { AgentContextService } from './agent-context.service';

describe('AgentContextService', () => {
  const getProfile = jest.fn();
  const getWeightTrend = jest.fn();
  const getRecentSleep = jest.fn();
  const getTodayWorkout = jest.fn();
  const getCurrentTrainingCycle = jest.fn();
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
    getCurrentTrainingCycle,
    getRecentExercisePerformance,
  } as unknown as WorkoutService;

  const service = new AgentContextService(
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
    getCurrentTrainingCycle.mockReset();
    getRecentExercisePerformance.mockReset();
  });

  it('aggregates all required data sources into one stable context', async () => {
    const userProfile = { id: 'profile-id' };
    const todayWorkout = { date: new Date(2026, 6, 28), exercises: [] };
    const currentTrainingCycle = { id: 'cycle-id' };
    const weightTrend7Days = {
      days: 7,
      recordCount: 7,
      averageWeight: 75.2,
      firstWeight: 75.5,
      latestWeight: 75,
      minWeight: 75,
      maxWeight: 75.5,
      weightRange: 0.5,
      volatility: 0.16,
      weeklyAverageChange: -0.58,
      change: -0.5,
      trend: WeightTrendDirection.STABLE,
    };
    const weightTrend30Days = {
      days: 30,
      recordCount: 24,
      averageWeight: 76,
      firstWeight: 77,
      latestWeight: 75,
      minWeight: 75,
      maxWeight: 77.2,
      weightRange: 2.2,
      volatility: 0.62,
      weeklyAverageChange: -0.5,
      change: -2,
      trend: WeightTrendDirection.DECREASING,
    };
    const sleepSummary7Days = {
      days: 7,
      averageDurationMinutes: 430,
      status: SleepStatus.GOOD,
    };
    const recentExercisePerformance = [
      {
        id: 'exercise-record-id',
        workoutSessionId: 'session-id',
        date: new Date(2026, 6, 30),
        category: 'chest',
        exerciseName: 'barbell bench press',
        actualWeight: 80,
        sets: 4,
        reps: 8,
        rpe: 9,
        completed: true,
        averageRpe: 8.5,
        lastWeight: 80,
        lastSets: 4,
        lastReps: 8,
        lastRpe: 9,
        progressTrend: 'improving',
      },
    ];

    getProfile.mockResolvedValue(userProfile);
    getTodayWorkout.mockResolvedValue(todayWorkout);
    getCurrentTrainingCycle.mockResolvedValue(currentTrainingCycle);
    getWeightTrend.mockResolvedValueOnce(weightTrend7Days).mockResolvedValueOnce(weightTrend30Days);
    getRecentSleep.mockResolvedValue(sleepSummary7Days);
    getRecentExercisePerformance.mockResolvedValue(recentExercisePerformance);

    await expect(service.buildContext()).resolves.toEqual({
      userProfile,
      todayWorkout,
      currentTrainingCycle,
      weightTrend7Days,
      weightTrend30Days,
      sleepSummary7Days,
      recentExercisePerformance,
    });
    expect(getProfile).toHaveBeenCalledTimes(1);
    expect(getTodayWorkout).toHaveBeenCalledTimes(1);
    expect(getCurrentTrainingCycle).toHaveBeenCalledTimes(1);
    expect(getWeightTrend).toHaveBeenNthCalledWith(1, 7);
    expect(getWeightTrend).toHaveBeenNthCalledWith(2, 30);
    expect(getRecentSleep).toHaveBeenCalledWith(7);
    expect(getRecentExercisePerformance).toHaveBeenCalledTimes(1);
  });

  it('preserves null and empty states without generating fallback advice', async () => {
    const weightTrend7Days = {
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
    };
    const weightTrend30Days = {
      ...weightTrend7Days,
      days: 30,
    };
    const sleepSummary7Days = {
      days: 7,
      recordCount: 0,
      recentSleep: [],
      averageDurationMinutes: null,
      averageQuality: null,
      status: SleepStatus.NO_DATA,
    };

    getProfile.mockResolvedValue(null);
    getTodayWorkout.mockResolvedValue(null);
    getCurrentTrainingCycle.mockResolvedValue(null);
    getWeightTrend.mockResolvedValueOnce(weightTrend7Days).mockResolvedValueOnce(weightTrend30Days);
    getRecentSleep.mockResolvedValue(sleepSummary7Days);
    getRecentExercisePerformance.mockResolvedValue([]);

    await expect(service.buildContext()).resolves.toEqual({
      userProfile: null,
      todayWorkout: null,
      currentTrainingCycle: null,
      weightTrend7Days,
      weightTrend30Days,
      sleepSummary7Days,
      recentExercisePerformance: [],
    });
  });
});
