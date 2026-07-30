import { SleepStatus } from '../../sleep/dto/sleep-summary.dto';
import { WeightTrendDirection } from '../../weight/dto/weight-trend.dto';
import { ExerciseProgressTrend } from '../../workout/dto/exercise-performance.dto';
import { AgentContextDto } from '../context/agent-context.dto';
import { PromptBuilderService } from './prompt-builder.service';

describe('PromptBuilderService', () => {
  const service = new PromptBuilderService();
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
  const context: AgentContextDto = {
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
        date: new Date('2026-07-30T00:00:00.000Z'),
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

  it('builds a system message with rules and serialized read-only context', () => {
    const messages = service.buildMessages(context, '  我今天应该练什么？  ');

    expect(messages).toHaveLength(2);
    expect(messages[0]).toMatchObject({
      role: 'system',
    });
    expect(messages[0].content).toContain('私人减脂教练和数据分析助手');
    expect(messages[0].content).toContain('只能使用当前 Context 中提供的数据');
    expect(messages[0].content).toContain('不允许编造不存在的体重、睡眠、训练、饮食或完成记录');
    expect(messages[0].content).toContain('数据不足时必须明确说明');
    expect(messages[0].content).toContain('不根据单次体重变化判断减脂失败');
    expect(messages[0].content).toContain('优先分析 7 日平均体重和趋势');
    expect(messages[0].content).toContain('不因 1 至 3 天上涨直接判断脂肪增加');
    expect(messages[0].content).toContain('如果没有训练表现数据');
    expect(messages[0].content).toContain('最近完成记录、RPE、重量变化和完成情况');
    expect(messages[0].content).toContain('渐进超负荷、RPE 控制和恢复状态');
    expect(messages[0].content).toContain('基础动作教学');
    expect(messages[0].content).toContain('睡眠正常时不要过度强调');
    expect(messages[0].content).toContain('当前状态总结');
    expect(messages[0].content).toContain('风险判断');
    expect(messages[0].content).toContain('不修改用户的长期训练计划');
    expect(messages[0].content).toContain('避免大量基础健身科普');
    expect(messages[0].content).toContain('可以调用已有写入工具');
    expect(messages[0].content).toContain('写入所需字段不足时必须先追问');
    expect(messages[0].content).toContain('"weightTrend7Days"');
    expect(messages[0].content).toContain('"weeklyAverageChange"');
    expect(messages[0].content).toContain('"lastWeight": 80');
    expect(messages[0].content).toContain('"lastRpe": 9');
    expect(messages[0].content).toContain('"progressTrend": "improving"');
    expect(messages[0].content).toContain('"insufficient_data"');
    expect(messages[1]).toEqual({
      role: 'user',
      content: '我今天应该练什么？',
    });
  });

  it('rejects an empty user message', () => {
    expect(() => service.buildMessages(context, '   ')).toThrow('userMessage must not be empty');
  });
});
