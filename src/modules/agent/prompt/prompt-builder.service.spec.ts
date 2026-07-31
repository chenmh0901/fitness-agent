import {
  CoachAdjustmentRecommendationType,
  CoachAdjustmentStatus,
  CoachInsightSeverity,
  CoachInsightType,
  FitnessGoalPriority,
  FitnessGoalStatus,
  FitnessGoalType,
  TrainingPlanVersionStatus,
} from '../../../generated/prisma/client';
import { CoachAnalysisStatus } from '../../coach-insight/dto/coach-analysis.dto';
import { CoachRecommendationType } from '../../coach-recommendation/dto/coach-recommendation.dto';
import { SleepStatus } from '../../sleep/dto/sleep-summary.dto';
import { WeightTrendDirection } from '../../weight/dto/weight-trend.dto';
import { ExerciseProgressTrend } from '../../workout/dto/exercise-performance.dto';
import { AgentContextDto } from '../context/agent-context.dto';
import { CoachContextWithInsightsDto } from '../context/coach-context-with-insights.dto';
import { CoachContextDto } from '../context/coach-context.dto';
import { PromptBuilderService } from './prompt-builder.service';

describe('PromptBuilderService', () => {
  const service = new PromptBuilderService();
  const date = new Date('2026-08-01T00:00:00.000Z');
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
  const legacyContext: AgentContextDto = {
    userProfile: null,
    todayWorkout: null,
    currentTrainingCycle: null,
    weightTrend7Days: emptyWeightTrend,
    weightTrend30Days: {
      ...emptyWeightTrend,
      days: 30,
    },
    sleepSummary7Days: {
      days: 7,
      recordCount: 0,
      recentSleep: [],
      averageDurationMinutes: null,
      averageQuality: null,
      status: SleepStatus.NO_DATA,
    },
    recentExercisePerformance: [
      {
        id: 'exercise-record-id',
        workoutSessionId: 'session-id',
        date,
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
        progressTrend: ExerciseProgressTrend.IMPROVING,
      },
    ],
  };

  it('builds a system message with the evidence and no-automatic-adjustment rules', () => {
    const messages = service.buildMessages(legacyContext, '  我今天应该练什么？  ');

    expect(messages).toHaveLength(2);
    expect(messages[0]).toMatchObject({ role: 'system' });
    expect(messages[0].content).toContain('Personal AI Fitness Coach');
    expect(messages[0].content).toContain('只能使用当前 Context 中提供的数据');
    expect(messages[0].content).toContain('不允许编造');
    expect(messages[0].content).toContain('weeklyAverageChange');
    expect(messages[0].content).toContain('不得直接修改计划');
    expect(messages[0].content).toContain('"lastWeight": 80');
    expect(messages[0].content).toContain('"lastRpe": 9');
    expect(messages[0].content).toContain('"progressTrend": "improving"');
    expect(messages[1]).toEqual({
      role: 'user',
      content: '我今天应该练什么？',
    });
  });

  it('prioritizes serialized Coach Insights and explains why they matter', () => {
    const coachContext: CoachContextDto = {
      userProfile: null,
      activeGoal: {
        id: 'goal-id',
        userId: 'profile-id',
        type: FitnessGoalType.FAT_LOSS,
        startWeight: 91.7,
        targetWeight: 85,
        targetBodyFat: null,
        startDate: date,
        targetDate: new Date('2026-09-26T00:00:00.000Z'),
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
        completedSessions: 3,
        adherenceRate: 60,
      },
      weightTrend: {
        recent7Days: emptyWeightTrend,
        recent30Days: {
          ...emptyWeightTrend,
          days: 30,
        },
      },
      sleepSummary: legacyContext.sleepSummary7Days,
      nutritionSummary: null,
      dailyStatus: null,
      recentExercisePerformance: legacyContext.recentExercisePerformance,
      recentAdjustments: [
        {
          id: 'adjustment-id',
          userId: 'profile-id',
          cycleId: 'cycle-id',
          recommendationType: CoachAdjustmentRecommendationType.NUTRITION_CALORIES,
          oldValue: { calories: 2200 },
          newValue: { calories: 2050 },
          reason: '减脂速度低于目标',
          status: CoachAdjustmentStatus.ACCEPTED,
          createdAt: date,
          updatedAt: date,
        },
      ],
      currentPlanVersion: {
        id: 'plan-version-2',
        trainingCycleId: 'cycle-id',
        versionNumber: 2,
        status: TrainingPlanVersionStatus.ACTIVE,
        changeReason: 'reduce fatigue',
        createdFromVersionId: 'plan-version-1',
        workoutPlans: [],
        createdAt: date,
        updatedAt: date,
      },
      recentPlanChanges: [
        {
          fromVersion: 1,
          toVersion: 2,
          reason: 'reduce fatigue',
          createdAt: date,
        },
      ],
    };
    const context: CoachContextWithInsightsDto = {
      coachContext,
      status: CoachAnalysisStatus.WARNING,
      insights: [
        {
          type: CoachInsightType.TRAINING,
          severity: CoachInsightSeverity.WARNING,
          content: '最近7天训练执行率偏低。',
          metadata: {
            plannedSessions: 5,
            completedSessions: 3,
            adherenceRate: 60,
          },
        },
      ],
      recommendations: [
        {
          type: CoachRecommendationType.TRAINING,
          action: '优先完成下一次已安排训练。',
          reason: '最近7天计划5次，完成3次，执行率60%。',
        },
      ],
    };

    const messages = service.buildMessages(context, '分析当前执行情况');

    expect(messages[0].content).toContain('使用 insights 解释当前风险、执行状态和建议依据');
    expect(messages[0].content).toContain('为什么重要');
    expect(messages[0].content).toContain('不得声称系统已经根据 Insight 自动调整');
    expect(messages[0].content).toContain('优先解释 Context 中的 recommendations');
    expect(messages[0].content).toContain('必须同时引用 recommendation.reason');
    expect(messages[0].content).toContain('不代表训练、营养、恢复或长期目标计划已经被修改');
    expect(messages[0].content).toContain('"status": "warning"');
    expect(messages[0].content).toContain('"type": "TRAINING"');
    expect(messages[0].content).toContain('"adherenceRate": 60');
    expect(messages[0].content).toContain('"action": "优先完成下一次已安排训练。"');
    expect(messages[0].content).toContain('"reason": "最近7天计划5次，完成3次，执行率60%。"');
    expect(messages[0].content).toContain('"recentAdjustments"');
    expect(messages[0].content).toContain('"recommendationType": "NUTRITION_CALORIES"');
    expect(messages[0].content).toContain('"status": "ACCEPTED"');
    expect(messages[0].content).toContain('讨论训练安排时必须引用 currentPlanVersion');
    expect(messages[0].content).toContain('只有已接受的 Adjustment 创建新版本后');
    expect(messages[0].content).toContain('"versionNumber": 2');
    expect(messages[0].content).toContain('"fromVersion": 1');
    expect(messages[0].content).toContain('"toVersion": 2');
  });

  it('rejects an empty user message', () => {
    expect(() => service.buildMessages(legacyContext, '   ')).toThrow(
      'userMessage must not be empty',
    );
  });
});
