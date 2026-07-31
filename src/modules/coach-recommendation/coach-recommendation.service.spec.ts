import {
  CoachInsightSeverity,
  CoachInsightType,
  FitnessGoalPriority,
  FitnessGoalStatus,
  FitnessGoalType,
  ProfileFitnessGoal,
  TrainingExperience,
} from '../../generated/prisma/client';
import { CoachContextWithInsightsDto } from '../agent/context/coach-context-with-insights.dto';
import { CoachContextDto } from '../agent/context/coach-context.dto';
import { CoachAnalysisStatus } from '../coach-insight/dto/coach-analysis.dto';
import { SleepStatus } from '../sleep/dto/sleep-summary.dto';
import { WeightTrendDirection } from '../weight/dto/weight-trend.dto';
import {
  ExercisePerformanceDto,
  ExerciseProgressTrend,
} from '../workout/dto/exercise-performance.dto';
import { CoachRecommendationService } from './coach-recommendation.service';
import { CoachRecommendationType } from './dto/coach-recommendation.dto';

describe('CoachRecommendationService', () => {
  const service = new CoachRecommendationService();
  const date = new Date('2026-07-31T00:00:00.000Z');

  function createCoachContext(overrides: Partial<CoachContextDto> = {}): CoachContextDto {
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
      dailyStatus: null,
      recentExercisePerformance: [],
      recentAdjustments: [],
      currentPlanVersion: null,
      recentPlanChanges: [],
      ...overrides,
    };
  }

  function createInput(
    overrides: Partial<CoachContextWithInsightsDto> = {},
  ): CoachContextWithInsightsDto {
    return {
      coachContext: createCoachContext(),
      status: CoachAnalysisStatus.NORMAL,
      insights: [],
      recommendations: [],
      ...overrides,
    };
  }

  it('returns no recommendation for a normal state', () => {
    const input = createInput({
      insights: [
        {
          type: CoachInsightType.WEIGHT,
          severity: CoachInsightSeverity.NORMAL,
          content: '体重速度正常',
          metadata: {},
        },
        {
          type: CoachInsightType.RECOVERY,
          severity: CoachInsightSeverity.NORMAL,
          content: '恢复正常',
          metadata: {},
        },
      ],
    });

    expect(service.generateRecommendations(input)).toEqual([]);
  });

  it('creates an executable goal recommendation for stalled fat loss', () => {
    const coachContext = createCoachContext();
    coachContext.weightTrend.recent7Days.weeklyAverageChange = -0.05;
    const input = createInput({
      coachContext,
      status: CoachAnalysisStatus.WARNING,
      insights: [
        {
          type: CoachInsightType.WEIGHT,
          severity: CoachInsightSeverity.WARNING,
          content: '实际减脂速度落后目标。',
          metadata: {
            targetWeeklyChangeKg: -0.84,
            actualWeeklyChangeKg: -0.05,
          },
        },
      ],
    });

    const recommendations = service.generateRecommendations(input);

    expect(recommendations).toHaveLength(1);
    expect(recommendations[0]).toMatchObject({
      type: CoachRecommendationType.GOAL,
    });
    expect(recommendations[0].action).toContain('继续记录晨起体重');
    expect(recommendations[0].action).toContain('2200kcal');
    expect(recommendations[0].reason).toContain('实际减脂速度落后目标');
  });

  it('creates a training recommendation when strength performance declines', () => {
    const decliningPerformance: ExercisePerformanceDto = {
      id: 'record-id',
      workoutSessionId: 'session-id',
      date,
      category: 'chest',
      exerciseName: 'barbell bench press',
      actualWeight: 80,
      sets: 4,
      reps: 8,
      rpe: 9,
      completed: false,
      averageRpe: 8.5,
      lastWeight: 80,
      lastSets: 4,
      lastReps: 8,
      lastRpe: 9,
      progressTrend: ExerciseProgressTrend.DECLINING,
    };
    const input = createInput({
      coachContext: createCoachContext({
        recentExercisePerformance: [decliningPerformance],
      }),
    });

    const [recommendation] = service.generateRecommendations(input);

    expect(recommendation.type).toBe(CoachRecommendationType.TRAINING);
    expect(recommendation.action).toContain('下调 2.5%-5%');
    expect(recommendation.action).toContain('RPE 8');
    expect(recommendation.reason).toContain('progressTrend 为 declining');
    expect(recommendation.reason).toContain('80kg');
  });

  it('creates a recovery recommendation when recovery is insufficient', () => {
    const input = createInput({
      status: CoachAnalysisStatus.WARNING,
      insights: [
        {
          type: CoachInsightType.RECOVERY,
          severity: CoachInsightSeverity.WARNING,
          content: '平均睡眠6.5小时，今日疲劳7/10，存在恢复不足信号。',
          metadata: {
            averageSleepMinutes: 390,
            fatigueLevel: 7,
          },
        },
      ],
    });

    const [recommendation] = service.generateRecommendations(input);

    expect(recommendation.type).toBe(CoachRecommendationType.RECOVERY);
    expect(recommendation.action).toContain('RPE 8');
    expect(recommendation.action).toContain('至少7小时睡眠');
    expect(recommendation.reason).toContain('疲劳7/10');
  });

  it('creates a nutrition recommendation for insufficient protein', () => {
    const input = createInput({
      coachContext: createCoachContext({
        nutritionSummary: {
          days: 7,
          recordCount: 7,
          recentNutrition: [],
          averageCalories: 2100,
          averageProtein: 120,
          averageCarbs: 230,
          averageFat: 60,
        },
      }),
      status: CoachAnalysisStatus.WARNING,
      insights: [
        {
          type: CoachInsightType.NUTRITION,
          severity: CoachInsightSeverity.WARNING,
          content: '平均蛋白质120g，低于160g目标。',
          metadata: {
            averageProtein: 120,
            targetProtein: 160,
          },
        },
      ],
    });

    const [recommendation] = service.generateRecommendations(input);

    expect(recommendation.type).toBe(CoachRecommendationType.NUTRITION);
    expect(recommendation.action).toContain('每日蛋白质增加约 40g');
    expect(recommendation.action).toContain('2200kcal');
    expect(recommendation.reason).toContain('低于160g目标');
  });
});
