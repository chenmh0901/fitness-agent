import { CoachAdjustmentService } from '../../coach-adjustment/coach-adjustment.service';
import { TrainingPlanVersionService } from '../../coach-plan-version/training-plan-version.service';
import { DailyStatusService } from '../../daily-status/daily-status.service';
import { FitnessGoalService } from '../../fitness-goal/fitness-goal.service';
import { NutritionService } from '../../nutrition/nutrition.service';
import { SleepStatus } from '../../sleep/dto/sleep-summary.dto';
import { SleepService } from '../../sleep/sleep.service';
import { UserProfileService } from '../../user/user-profile.service';
import { WeightTrendDirection } from '../../weight/dto/weight-trend.dto';
import { WeightService } from '../../weight/weight.service';
import { WorkoutService } from '../../workout/workout.service';
import { CoachContextService } from './coach-context.service';

describe('CoachContextService', () => {
  const getProfile = jest.fn();
  const getActiveGoal = jest.fn();
  const getWeightTrend = jest.fn();
  const getRecentSleep = jest.fn();
  const getRecentNutrition = jest.fn();
  const getTodayStatus = jest.fn();
  const getCurrentTrainingCycle = jest.fn();
  const getTodayWorkout = jest.fn();
  const getTrainingAdherence = jest.fn();
  const getRecentExercisePerformance = jest.fn();
  const getAdjustmentHistory = jest.fn();
  const getActivePlanVersion = jest.fn();
  const getPlanVersionHistory = jest.fn();
  const getRecentPlanChanges = jest.fn();
  const service = new CoachContextService(
    { getProfile } as unknown as UserProfileService,
    { getActiveGoal } as unknown as FitnessGoalService,
    { getWeightTrend } as unknown as WeightService,
    { getRecentSleep } as unknown as SleepService,
    { getRecentNutrition } as unknown as NutritionService,
    { getTodayStatus } as unknown as DailyStatusService,
    {
      getCurrentTrainingCycle,
      getTodayWorkout,
      getTrainingAdherence,
      getRecentExercisePerformance,
    } as unknown as WorkoutService,
    {
      getHistory: getAdjustmentHistory,
    } as unknown as CoachAdjustmentService,
    {
      getActiveVersion: getActivePlanVersion,
      getVersionHistory: getPlanVersionHistory,
      getRecentPlanChanges,
    } as unknown as TrainingPlanVersionService,
  );

  beforeEach(() => {
    getProfile.mockReset();
    getActiveGoal.mockReset();
    getWeightTrend.mockReset();
    getRecentSleep.mockReset();
    getRecentNutrition.mockReset();
    getTodayStatus.mockReset();
    getCurrentTrainingCycle.mockReset();
    getTodayWorkout.mockReset();
    getTrainingAdherence.mockReset();
    getRecentExercisePerformance.mockReset();
    getAdjustmentHistory.mockReset();
    getActivePlanVersion.mockReset();
    getPlanVersionHistory.mockReset();
    getRecentPlanChanges.mockReset();
  });

  it('aggregates the complete coach context in parallel', async () => {
    const userProfile = { id: 'profile-id', currentWeight: 91.2 };
    const activeGoal = { id: 'goal-id', targetWeight: 85 };
    const trainingCycle = { id: 'cycle-id' };
    const todayWorkout = { date: new Date(2026, 7, 1), exercises: [] };
    const trainingAdherence = {
      days: 7,
      plannedSessions: 5,
      completedSessions: 4,
      adherenceRate: 80,
    };
    const recent7Days = { days: 7, averageWeight: 91.2 };
    const recent30Days = { days: 30, averageWeight: 91.8 };
    const sleepSummary = { days: 7, averageDurationMinutes: 450 };
    const nutritionSummary = { days: 7, averageCalories: 2200 };
    const dailyStatus = { energyLevel: 7, fatigueLevel: 3 };
    const recentExercisePerformance = [
      { exerciseName: 'barbell bench press', lastWeight: 80, lastRpe: 9 },
    ];
    const recentAdjustments = [
      {
        id: 'adjustment-id',
        status: 'ACCEPTED',
        reason: 'reduce calories',
      },
    ];
    const currentPlanVersion = {
      id: 'plan-version-2',
      versionNumber: 2,
      changeReason: 'reduce fatigue',
    };
    const planVersionHistory = [
      currentPlanVersion,
      {
        id: 'plan-version-1',
        versionNumber: 1,
      },
    ];
    const recentPlanChanges = [
      {
        fromVersion: 1,
        toVersion: 2,
        reason: 'reduce fatigue',
      },
    ];
    getProfile.mockResolvedValue(userProfile);
    getActiveGoal.mockResolvedValue(activeGoal);
    getCurrentTrainingCycle.mockResolvedValue(trainingCycle);
    getTodayWorkout.mockResolvedValue(todayWorkout);
    getTrainingAdherence.mockResolvedValue(trainingAdherence);
    getWeightTrend.mockResolvedValueOnce(recent7Days).mockResolvedValueOnce(recent30Days);
    getRecentSleep.mockResolvedValue(sleepSummary);
    getRecentNutrition.mockResolvedValue(nutritionSummary);
    getTodayStatus.mockResolvedValue(dailyStatus);
    getRecentExercisePerformance.mockResolvedValue(recentExercisePerformance);
    getAdjustmentHistory.mockResolvedValue(recentAdjustments);
    getActivePlanVersion.mockResolvedValue(currentPlanVersion);
    getPlanVersionHistory.mockResolvedValue(planVersionHistory);
    getRecentPlanChanges.mockReturnValue(recentPlanChanges);

    await expect(service.buildContext()).resolves.toEqual({
      userProfile,
      activeGoal,
      trainingCycle,
      todayWorkout,
      trainingAdherence,
      weightTrend: {
        recent7Days,
        recent30Days,
      },
      sleepSummary,
      nutritionSummary,
      dailyStatus,
      recentExercisePerformance,
      recentAdjustments,
      currentPlanVersion,
      recentPlanChanges,
    });
    expect(getProfile).toHaveBeenCalledTimes(1);
    expect(getActiveGoal).toHaveBeenCalledTimes(1);
    expect(getCurrentTrainingCycle).toHaveBeenCalledTimes(1);
    expect(getTodayWorkout).toHaveBeenCalledTimes(1);
    expect(getTrainingAdherence).toHaveBeenCalledWith(7);
    expect(getWeightTrend).toHaveBeenNthCalledWith(1, 7);
    expect(getWeightTrend).toHaveBeenNthCalledWith(2, 30);
    expect(getRecentSleep).toHaveBeenCalledWith(7);
    expect(getRecentNutrition).toHaveBeenCalledWith(7);
    expect(getTodayStatus).toHaveBeenCalledTimes(1);
    expect(getRecentExercisePerformance).toHaveBeenCalledTimes(1);
    expect(getAdjustmentHistory).toHaveBeenCalledTimes(1);
    expect(getActivePlanVersion).toHaveBeenCalledTimes(1);
    expect(getPlanVersionHistory).toHaveBeenCalledTimes(1);
    expect(getRecentPlanChanges).toHaveBeenCalledWith(planVersionHistory);
  });

  it('preserves null, empty, and insufficient-data states', async () => {
    const emptyWeightTrend = {
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
    const emptySleepSummary = {
      days: 7,
      recordCount: 0,
      recentSleep: [],
      averageDurationMinutes: null,
      averageQuality: null,
      status: SleepStatus.NO_DATA,
    };
    getProfile.mockResolvedValue(null);
    getActiveGoal.mockResolvedValue(null);
    getCurrentTrainingCycle.mockResolvedValue(null);
    getTodayWorkout.mockResolvedValue(null);
    getTrainingAdherence.mockResolvedValue({
      days: 7,
      plannedSessions: 0,
      completedSessions: 0,
      adherenceRate: null,
    });
    getWeightTrend
      .mockResolvedValueOnce(emptyWeightTrend)
      .mockResolvedValueOnce({ ...emptyWeightTrend, days: 30 });
    getRecentSleep.mockResolvedValue(emptySleepSummary);
    getRecentNutrition.mockResolvedValue(null);
    getTodayStatus.mockResolvedValue(null);
    getRecentExercisePerformance.mockResolvedValue([]);
    getAdjustmentHistory.mockResolvedValue([]);
    getActivePlanVersion.mockResolvedValue(null);
    getPlanVersionHistory.mockResolvedValue([]);
    getRecentPlanChanges.mockReturnValue([]);

    await expect(service.buildContext()).resolves.toEqual({
      userProfile: null,
      activeGoal: null,
      trainingCycle: null,
      todayWorkout: null,
      trainingAdherence: {
        days: 7,
        plannedSessions: 0,
        completedSessions: 0,
        adherenceRate: null,
      },
      weightTrend: {
        recent7Days: emptyWeightTrend,
        recent30Days: { ...emptyWeightTrend, days: 30 },
      },
      sleepSummary: emptySleepSummary,
      nutritionSummary: null,
      dailyStatus: null,
      recentExercisePerformance: [],
      recentAdjustments: [],
      currentPlanVersion: null,
      recentPlanChanges: [],
    });
  });
});
