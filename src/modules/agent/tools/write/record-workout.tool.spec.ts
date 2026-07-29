import { ExercisePerformanceDto } from '../../../workout/dto/exercise-performance.dto';
import { WorkoutService } from '../../../workout/workout.service';
import { RecordWorkoutTool } from './record-workout.tool';

describe('RecordWorkoutTool', () => {
  const recordWorkout = jest.fn();
  const workoutService = {
    recordWorkout,
  } as unknown as WorkoutService;
  const tool = new RecordWorkoutTool(workoutService);

  beforeEach(() => {
    recordWorkout.mockReset();
  });

  it('exposes the record_workout function schema', () => {
    expect(tool.name).toBe('record_workout');
    expect(tool.parameters).toEqual({
      type: 'object',
      properties: {
        exerciseName: {
          type: 'string',
          description: '动作名称，例如 barbell bench press',
        },
        weight: {
          type: 'number',
          description: '实际重量，单位为 kg',
          minimum: 0,
        },
        sets: {
          type: 'integer',
          description: '完成组数',
          minimum: 1,
        },
        reps: {
          type: 'integer',
          description: '每组重复次数',
          minimum: 1,
        },
        date: {
          type: 'string',
          description: '训练日期，格式 YYYY-MM-DD',
        },
      },
      required: ['exerciseName', 'weight', 'sets', 'reps', 'date'],
      additionalProperties: false,
    });
  });

  it('normalizes input and delegates the write to WorkoutService', async () => {
    const date = new Date(2026, 6, 29);
    const savedRecord = {
      id: 'exercise-id',
      workoutSessionId: 'session-id',
      exerciseName: 'barbell bench press',
      actualWeight: 80,
      sets: 4,
      reps: 8,
      date,
    } as ExercisePerformanceDto;
    recordWorkout.mockResolvedValue(savedRecord);

    await expect(
      tool.execute({
        exerciseName: '  barbell bench press  ',
        weight: 80,
        sets: 4,
        reps: 8,
        date: '2026-07-29',
      }),
    ).resolves.toBe(savedRecord);
    expect(recordWorkout).toHaveBeenCalledWith({
      exerciseName: 'barbell bench press',
      weight: 80,
      sets: 4,
      reps: 8,
      date,
    });
  });

  it.each([
    undefined,
    { exerciseName: '', weight: 80, sets: 4, reps: 8, date: '2026-07-29' },
    {
      exerciseName: 'barbell bench press',
      weight: -1,
      sets: 4,
      reps: 8,
      date: '2026-07-29',
    },
    {
      exerciseName: 'barbell bench press',
      weight: 80,
      sets: 0,
      reps: 8,
      date: '2026-07-29',
    },
  ])('rejects invalid input %p without calling WorkoutService', async (input) => {
    await expect(tool.execute(input)).rejects.toBeInstanceOf(TypeError);
    expect(recordWorkout).not.toHaveBeenCalled();
  });
});
