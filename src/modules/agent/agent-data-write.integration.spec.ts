import { ConfigService } from '@nestjs/config';
import { WeightRecordType } from '../../generated/prisma/client';
import { SleepService } from '../sleep/sleep.service';
import { WeightService } from '../weight/weight.service';
import { WorkoutService } from '../workout/workout.service';
import { AgentService } from './agent.service';
import { AgentContextDto } from './context/agent-context.dto';
import { AgentContextService } from './context/agent-context.service';
import { AgentLoopService } from './execution/agent-loop.service';
import { AIMessage, AIProvider } from './provider/ai-provider.interface';
import { PromptBuilderService } from './prompt/prompt-builder.service';
import { ToolRegistryService } from './tools/tool-registry.service';
import { ToolSchemaBuilderService } from './tools/tool-schema-builder.service';
import { RecordSleepTool } from './tools/write/record-sleep.tool';
import { RecordWeightTool } from './tools/write/record-weight.tool';
import { RecordWorkoutTool } from './tools/write/record-workout.tool';

describe('Agent personal data write integration', () => {
  const buildContext = jest.fn();
  const buildMessages = jest.fn();
  const providerChat = jest.fn();
  const recordWeight = jest.fn();
  const recordSleep = jest.fn();
  const recordWorkout = jest.fn();

  const agentContextService = {
    buildContext,
  } as unknown as AgentContextService;
  const promptBuilderService = {
    buildMessages,
  } as unknown as PromptBuilderService;
  const aiProvider = {
    chat: providerChat,
  } as unknown as AIProvider;
  const configService = {
    get: jest.fn().mockReturnValue('test'),
  } as unknown as ConfigService;
  const weightService = {
    recordWeight,
  } as unknown as WeightService;
  const sleepService = {
    recordSleep,
  } as unknown as SleepService;
  const workoutService = {
    recordWorkout,
  } as unknown as WorkoutService;
  const registry = new ToolRegistryService(new ToolSchemaBuilderService());

  registry.register(new RecordWeightTool(weightService));
  registry.register(new RecordSleepTool(sleepService));
  registry.register(new RecordWorkoutTool(workoutService));

  const loop = new AgentLoopService(
    agentContextService,
    promptBuilderService,
    aiProvider,
    registry,
    configService,
  );
  const agentService = new AgentService(loop);

  beforeEach(() => {
    buildContext.mockReset();
    buildMessages.mockReset();
    providerChat.mockReset();
    recordWeight.mockReset();
    recordSleep.mockReset();
    recordWorkout.mockReset();

    buildContext.mockResolvedValue({ userProfile: null });
    buildMessages.mockImplementation(
      (_context: AgentContextDto, userMessage: string): AIMessage[] => [
        { role: 'system', content: 'system prompt' },
        { role: 'user', content: userMessage },
      ],
    );
  });

  it('records "今天早上90.5kg" through record_weight and returns final text', async () => {
    const date = new Date(2026, 6, 29);
    recordWeight.mockResolvedValue({
      id: 'weight-id',
      weight: 90.5,
      recordType: WeightRecordType.MORNING,
      date,
    });
    providerChat
      .mockResolvedValueOnce({
        type: 'tool_call',
        toolName: 'record_weight',
        arguments: {
          weight: 90.5,
          recordType: 'morning',
          date: '2026-07-29',
        },
      })
      .mockResolvedValueOnce({
        type: 'text',
        content: '已记录今天晨起体重 90.5kg。',
      });

    await expect(agentService.chat('今天早上90.5kg')).resolves.toBe('已记录今天晨起体重 90.5kg。');
    expect(recordWeight).toHaveBeenCalledWith({
      weight: 90.5,
      recordType: WeightRecordType.MORNING,
      date,
    });
    expect(providerChat).toHaveBeenCalledTimes(2);
  });

  it('records "昨晚睡6小时" through record_sleep and returns final text', async () => {
    const date = new Date(2026, 6, 28);
    recordSleep.mockResolvedValue({
      id: 'sleep-id',
      durationMinutes: 360,
      quality: 3,
      date,
    });
    providerChat
      .mockResolvedValueOnce({
        type: 'tool_call',
        toolName: 'record_sleep',
        arguments: {
          durationMinutes: 360,
          quality: 3,
          date: '2026-07-28',
        },
      })
      .mockResolvedValueOnce({
        type: 'text',
        content: '已记录昨晚睡眠 6 小时。',
      });

    await expect(agentService.chat('昨晚睡6小时')).resolves.toBe('已记录昨晚睡眠 6 小时。');
    expect(recordSleep).toHaveBeenCalledWith({
      durationMinutes: 360,
      quality: 3,
      date,
    });
    expect(providerChat).toHaveBeenCalledTimes(2);
  });

  it('records "今天卧推80kg" through record_workout and returns final text', async () => {
    const date = new Date(2026, 6, 29);
    recordWorkout.mockResolvedValue({
      id: 'exercise-id',
      workoutSessionId: 'session-id',
      exerciseName: 'barbell bench press',
      actualWeight: 80,
      sets: 4,
      reps: 8,
      date,
    });
    providerChat
      .mockResolvedValueOnce({
        type: 'tool_call',
        toolName: 'record_workout',
        arguments: {
          exerciseName: 'barbell bench press',
          weight: 80,
          sets: 4,
          reps: 8,
          date: '2026-07-29',
        },
      })
      .mockResolvedValueOnce({
        type: 'text',
        content: '已记录今天卧推 80kg，4 组 × 8 次。',
      });

    await expect(agentService.chat('今天卧推80kg')).resolves.toBe(
      '已记录今天卧推 80kg，4 组 × 8 次。',
    );
    expect(recordWorkout).toHaveBeenCalledWith({
      exerciseName: 'barbell bench press',
      weight: 80,
      sets: 4,
      reps: 8,
      date,
    });
    expect(providerChat).toHaveBeenCalledTimes(2);
  });
});
