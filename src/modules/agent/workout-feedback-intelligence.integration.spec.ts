import { ConfigService } from '@nestjs/config';
import { SleepStatus } from '../sleep/dto/sleep-summary.dto';
import { WeightTrendDirection } from '../weight/dto/weight-trend.dto';
import { ExerciseProgressTrend } from '../workout/dto/exercise-performance.dto';
import { WorkoutService } from '../workout/workout.service';
import { AgentContextDto } from './context/agent-context.dto';
import { AgentContextService } from './context/agent-context.service';
import { AgentLoopService } from './execution/agent-loop.service';
import { AIMessage, AIProvider, AIResponse } from './provider/ai-provider.interface';
import { PromptBuilderService } from './prompt/prompt-builder.service';
import { ToolRegistryService } from './tools/tool-registry.service';
import { ToolSchemaBuilderService } from './tools/tool-schema-builder.service';
import { RecordWorkoutTool } from './tools/write/record-workout.tool';
import { AgentService } from './agent.service';

describe('Workout feedback intelligence integration', () => {
  it('passes recent load and RPE feedback through Context to the Agent response', async () => {
    const context: AgentContextDto = {
      userProfile: null,
      todayWorkout: null,
      currentTrainingCycle: null,
      weightTrend7Days: {
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
      weightTrend30Days: {
        days: 30,
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
          id: 'bench-record-id',
          workoutSessionId: 'session-id',
          date: new Date('2026-07-30T00:00:00.000Z'),
          category: 'chest',
          exerciseName: 'barbell bench press',
          actualWeight: 80,
          sets: 4,
          reps: 8,
          rpe: 8,
          completed: true,
          averageRpe: 8,
          lastWeight: 80,
          lastSets: 4,
          lastReps: 8,
          lastRpe: 8,
          progressTrend: ExerciseProgressTrend.STABLE,
        },
      ],
    };
    const buildContext = jest.fn().mockResolvedValue(context);
    const recordWorkoutFeedback = jest.fn().mockResolvedValue({
      id: 'new-bench-record-id',
      workoutSessionId: 'new-session-id',
      date: new Date('2026-07-30T00:00:00.000Z'),
      category: 'strength',
      exerciseName: 'barbell bench press',
      actualWeight: 80,
      sets: 4,
      reps: 8,
      rpe: 9,
      completed: true,
      averageRpe: 9,
      lastWeight: 80,
      lastSets: 4,
      lastReps: 8,
      lastRpe: 9,
      progressTrend: ExerciseProgressTrend.INSUFFICIENT_DATA,
    });
    const providerChat = jest
      .fn<Promise<AIResponse>, [readonly AIMessage[]]>()
      .mockResolvedValueOnce({
        type: 'tool_call',
        toolName: 'record_workout',
        arguments: {
          exerciseName: 'barbell bench press',
          weight: 80,
          sets: 4,
          reps: 8,
          rpe: 9,
          completed: true,
          date: '2026-07-30',
        },
      })
      .mockResolvedValueOnce({
        type: 'text',
        content:
          '最近一次卧推是80kg、4组×8次，最后RPE 9，当前趋势稳定。下次先保持80kg并把RPE控制在8左右；能够完整完成后再小幅加重。',
      });
    const aiProvider: AIProvider = {
      chat: providerChat,
    };
    const toolRegistry = new ToolRegistryService(new ToolSchemaBuilderService());
    toolRegistry.register(
      new RecordWorkoutTool({
        recordWorkout: jest.fn(),
        recordWorkoutFeedback,
      } as unknown as WorkoutService),
    );
    const loop = new AgentLoopService(
      { buildContext } as unknown as AgentContextService,
      new PromptBuilderService(),
      aiProvider,
      toolRegistry,
      {
        get: jest.fn().mockReturnValue('test'),
      } as unknown as ConfigService,
    );
    const agentService = new AgentService(loop);
    const userMessage = '我今天卧推80kg做了4组8次，最后一组RPE9，下次怎么办？';

    await expect(agentService.chat(userMessage)).resolves.toContain(
      '下次先保持80kg并把RPE控制在8左右',
    );
    expect(buildContext).toHaveBeenCalledTimes(1);
    expect(recordWorkoutFeedback).toHaveBeenCalledWith({
      exerciseName: 'barbell bench press',
      weight: 80,
      sets: 4,
      reps: 8,
      rpe: 9,
      completed: true,
      date: new Date(2026, 6, 30),
    });
    expect(providerChat).toHaveBeenCalledTimes(2);
    const initialMessages = providerChat.mock.calls[0][0];
    expect(initialMessages[0].content).toContain('"exerciseName": "barbell bench press"');
    expect(initialMessages[0].content).toContain('"lastWeight": 80');
    expect(initialMessages[0].content).toContain('"lastRpe": 8');
    expect(initialMessages[0].content).toContain('"progressTrend": "stable"');
    expect(initialMessages[1]).toEqual({
      role: 'user',
      content: userMessage,
    });
    const finalMessages = providerChat.mock.calls[1][0];
    expect(finalMessages.at(-1)).toMatchObject({
      role: 'tool',
      toolName: 'record_workout',
    });
    expect(finalMessages.at(-1)?.content).toContain('"rpe":9');
  });
});
