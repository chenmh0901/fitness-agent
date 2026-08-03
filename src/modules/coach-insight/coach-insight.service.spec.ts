import {
  CoachInsightSeverity,
  CoachInsightType,
  FitnessGoalPriority,
  FitnessGoalStatus,
  FitnessGoalType,
  ProfileFitnessGoal,
  TrainingExperience,
} from '../../generated/prisma/client';
import { CoachContextDto } from '../agent/context/coach-context.dto';
import { SleepStatus } from '../sleep/dto/sleep-summary.dto';
import { WeightTrendDirection } from '../weight/dto/weight-trend.dto';
import { CoachInsightService } from './coach-insight.service';

describe('CoachInsightService', () => {
  const service = new CoachInsightService();
  const date = new Date('2026-07-31T00:00:00.000Z');

  function createContext(overrides: Partial<CoachContextDto> = {}): CoachContextDto {
    return {
      userProfile: {
        id: 'profile-id',
        heightCm: 185,
        currentWeight: 91.2,
        goal: ProfileFitnessGoal.FAT_LOSS,
        trainingExperience: TrainingExperience.INTERMEDIATE,
        weeklyTrainingDays: 5,
        dailyCaloriesTarget: 2200,
        proteinTarget: 160,
        createdAt: date,
        updatedAt: date,
      },
      activeGoal: {
        id: 'goal-id',
        userId: 'profile-id',
        type: FitnessGoalType.FAT_LOSS,
        startWeight: 91.7,
        targetWeight: 85,
        targetBodyFat: null,
        startDate: date,
        targetDate: new Date('2026-09-25T00:00:00.000Z'),
        durationWeeks: 8,
        priority: FitnessGoalPriority.KEEP_STRENGTH,
        status: FitnessGoalStatus.ACTIVE,
        createdAt: date,
        updatedAt: date,
      },
      trainingCycle: null,
      todayWorkout: null,
      trainingAdherence: {
        days: 7,
        plannedSessions: 5,
        completedSessions: 5,
        adherenceRate: 100,
      },
      weightTrend: {
        recent7Days: {
          days: 7,
          recordCount: 7,
          averageWeight: 91.2,
          firstWeight: 91.8,
          latestWeight: 91,
          minWeight: 91,
          maxWeight: 91.8,
          weightRange: 0.8,
          volatility: 0.25,
          weeklyAverageChange: -0.8,
          change: -0.8,
          trend: WeightTrendDirection.DECREASING,
        },
        recent30Days: {
          days: 30,
          recordCount: 20,
          averageWeight: 91.6,
          firstWeight: 92.3,
          latestWeight: 91,
          minWeight: 91,
          maxWeight: 92.3,
          weightRange: 1.3,
          volatility: 0.35,
          weeklyAverageChange: -0.35,
          change: -1.3,
          trend: WeightTrendDirection.DECREASING,
        },
      },
      sleepSummary: {
        days: 7,
        recordCount: 7,
        recentSleep: [],
        averageDurationMinutes: 450,
        averageQuality: 4,
        status: SleepStatus.GOOD,
      },
      nutritionSummary: {
        days: 7,
        recordCount: 7,
        recentNutrition: [],
        averageCalories: 2200,
        averageProtein: 160,
        averageCarbs: 250,
        averageFat: 60,
      },
      dailyStatus: {
        id: 'status-id',
        userId: 'profile-id',
        date,
        energyLevel: 7,
        fatigueLevel: 3,
        muscleSoreness: 2,
        stressLevel: 4,
        notes: null,
        createdAt: date,
        updatedAt: date,
      },
      recentExercisePerformance: [],
      recentAdjustments: [],
      currentPlanVersion: null,
      recentPlanChanges: [],
      generatedPlan: null,
      ...overrides,
    };
  }

  it('marks weight progress as on track when actual weekly change matches the goal rate', () => {
    const [insight] = service.analyzeWeightProgress(createContext());

    expect(insight).toMatchObject({
      type: CoachInsightType.WEIGHT,
      severity: CoachInsightSeverity.NORMAL,
      metadata: {
        targetWeeklyChangeKg: -0.84,
        actualWeeklyChangeKg: -0.8,
      },
    });
  });

  it('warns when weight progress is behind the target rate', () => {
    const context = createContext();
    context.weightTrend.recent7Days.weeklyAverageChange = -0.2;

    const [insight] = service.analyzeWeightProgress(context);

    expect(insight).toMatchObject({
      type: CoachInsightType.WEIGHT,
      severity: CoachInsightSeverity.WARNING,
      metadata: {
        actualWeeklyChangeKg: -0.2,
      },
    });
    expect(insight.content).toContain('落后于目标');
  });

  it('detects low training adherence', () => {
    const context = createContext({
      trainingAdherence: {
        days: 7,
        plannedSessions: 5,
        completedSessions: 2,
        adherenceRate: 40,
      },
    });

    const [insight] = service.analyzeTrainingAdherence(context);

    expect(insight).toMatchObject({
      type: CoachInsightType.TRAINING,
      severity: CoachInsightSeverity.CRITICAL,
      metadata: {
        plannedSessions: 5,
        completedSessions: 2,
        adherenceRate: 40,
      },
    });
  });

  it('detects poor recovery from sleep, fatigue, and soreness', () => {
    const context = createContext({
      sleepSummary: {
        days: 7,
        recordCount: 5,
        recentSleep: [],
        averageDurationMinutes: 350,
        averageQuality: 2.5,
        status: SleepStatus.SHORT_DURATION_AND_LOW_QUALITY,
      },
      dailyStatus: {
        ...createContext().dailyStatus!,
        fatigueLevel: 8,
        muscleSoreness: 7,
      },
    });

    const [insight] = service.analyzeRecovery(context);

    expect(insight).toMatchObject({
      type: CoachInsightType.RECOVERY,
      severity: CoachInsightSeverity.CRITICAL,
      metadata: {
        averageSleepMinutes: 350,
        fatigueLevel: 8,
        muscleSoreness: 7,
      },
    });
  });

  it('detects insufficient protein intake against the personal target', () => {
    const context = createContext({
      nutritionSummary: {
        ...createContext().nutritionSummary!,
        averageProtein: 100,
      },
    });

    const [insight] = service.analyzeNutrition(context);

    expect(insight).toMatchObject({
      type: CoachInsightType.NUTRITION,
      severity: CoachInsightSeverity.CRITICAL,
      metadata: {
        averageProtein: 100,
        targetProtein: 160,
        proteinTargetAchievementPercent: 62.5,
      },
    });
  });

  it('returns no inferred insight when its required source data is missing', () => {
    const context = createContext({
      userProfile: null,
      activeGoal: null,
      nutritionSummary: null,
      dailyStatus: null,
      trainingAdherence: {
        days: 7,
        plannedSessions: 0,
        completedSessions: 0,
        adherenceRate: null,
      },
      sleepSummary: {
        days: 7,
        recordCount: 0,
        recentSleep: [],
        averageDurationMinutes: null,
        averageQuality: null,
        status: SleepStatus.NO_DATA,
      },
    });
    context.weightTrend.recent7Days.weeklyAverageChange = null;

    expect(service.analyzeWeightProgress(context)).toEqual([]);
    expect(service.analyzeTrainingAdherence(context)).toEqual([]);
    expect(service.analyzeRecovery(context)).toEqual([]);
    expect(service.analyzeNutrition(context)).toEqual([]);
  });
});
