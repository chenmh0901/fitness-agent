import { SleepStatus } from '../../sleep/dto/sleep-summary.dto';
import { WeightTrendDirection } from '../../weight/dto/weight-trend.dto';
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
    recentExercisePerformance: [],
  };

  it('builds a system message with rules and serialized read-only context', () => {
    const messages = service.buildMessages(context, '  我今天应该练什么？  ');

    expect(messages).toHaveLength(2);
    expect(messages[0]).toMatchObject({
      role: 'system',
    });
    expect(messages[0].content).toContain('你是用户的个人健身助手');
    expect(messages[0].content).toContain('不允许编造数据');
    expect(messages[0].content).toContain('数据不足时必须明确说明');
    expect(messages[0].content).toContain('不修改用户的长期训练计划');
    expect(messages[0].content).toContain('减少基础科普');
    expect(messages[0].content).toContain('"weightTrend7Days"');
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
