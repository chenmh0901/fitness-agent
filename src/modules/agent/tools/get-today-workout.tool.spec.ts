import { TodayWorkoutDto } from '../../workout/dto/today-workout.dto';
import { WorkoutService } from '../../workout/workout.service';
import { GetTodayWorkoutTool } from './get-today-workout.tool';

describe('GetTodayWorkoutTool', () => {
  const getTodayWorkout = jest.fn();
  const workoutService = {
    getTodayWorkout,
  } as unknown as WorkoutService;
  const tool = new GetTodayWorkoutTool(workoutService);

  beforeEach(() => {
    getTodayWorkout.mockReset();
  });

  it('exposes stable metadata', () => {
    expect(tool.name).toBe('get_today_workout');
    expect(tool.description).toContain('只读训练计划');
  });

  it('delegates execution to WorkoutService', async () => {
    const workout = { exercises: [] } as unknown as TodayWorkoutDto;
    getTodayWorkout.mockResolvedValue(workout);

    await expect(tool.execute()).resolves.toBe(workout);
    expect(getTodayWorkout).toHaveBeenCalledTimes(1);
  });

  it('preserves the null no-workout state', async () => {
    getTodayWorkout.mockResolvedValue(null);

    await expect(tool.execute()).resolves.toBeNull();
  });
});
