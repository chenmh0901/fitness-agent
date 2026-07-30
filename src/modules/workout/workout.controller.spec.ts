import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateWorkoutFeedbackDto } from './dto/create-workout-feedback.dto';
import { CreateWorkoutRecordDto } from './dto/create-workout-record.dto';
import { WorkoutService } from './workout.service';
import { WorkoutController } from './workout.controller';

describe('WorkoutController', () => {
  const recordWorkout = jest.fn();
  const recordWorkoutFeedback = jest.fn();
  const workoutService = {
    recordWorkout,
    recordWorkoutFeedback,
  } as unknown as WorkoutService;
  const controller = new WorkoutController(workoutService);

  beforeEach(() => {
    recordWorkout.mockReset();
    recordWorkoutFeedback.mockReset();
  });

  it('delegates validated workout feedback to WorkoutService', async () => {
    const request = plainToInstance(CreateWorkoutFeedbackDto, {
      exerciseName: '  barbell bench press  ',
      weight: 80,
      sets: 4,
      reps: 8,
      rpe: 9,
      completed: true,
      date: '2026-07-30',
    });
    const response = {
      id: 'exercise-record-id',
      exerciseName: 'barbell bench press',
      rpe: 9,
      completed: true,
    };
    recordWorkoutFeedback.mockResolvedValue(response);

    await expect(validate(request)).resolves.toEqual([]);
    await expect(controller.recordWorkoutFeedback(request)).resolves.toBe(response);
    expect(recordWorkoutFeedback).toHaveBeenCalledWith({
      exerciseName: 'barbell bench press',
      weight: 80,
      sets: 4,
      reps: 8,
      rpe: 9,
      completed: true,
      date: new Date('2026-07-30T00:00:00.000Z'),
    });
  });

  it.each([0, 11])('rejects feedback RPE %s outside the 1-10 range', async (rpe) => {
    const request = plainToInstance(CreateWorkoutFeedbackDto, {
      exerciseName: 'barbell bench press',
      weight: 80,
      sets: 4,
      reps: 8,
      rpe,
      completed: true,
      date: '2026-07-30',
    });

    const errors = await validate(request);

    expect(errors.map((error) => error.property)).toContain('rpe');
    expect(recordWorkoutFeedback).not.toHaveBeenCalled();
  });

  it('delegates a validated workout record to WorkoutService', async () => {
    const request = plainToInstance(CreateWorkoutRecordDto, {
      exerciseName: '  barbell bench press  ',
      weight: 80,
      sets: 4,
      reps: 8,
      date: '2026-07-30',
    });
    const response = {
      id: 'exercise-record-id',
      workoutSessionId: 'session-id',
      date: request.date,
      category: 'strength',
      exerciseName: 'barbell bench press',
      actualWeight: 80,
      sets: 4,
      reps: 8,
      rpe: null,
      completed: true,
    };
    recordWorkout.mockResolvedValue(response);

    await expect(validate(request)).resolves.toEqual([]);
    await expect(controller.recordWorkout(request)).resolves.toBe(response);
    expect(recordWorkout).toHaveBeenCalledWith({
      exerciseName: 'barbell bench press',
      weight: 80,
      sets: 4,
      reps: 8,
      date: new Date('2026-07-30T00:00:00.000Z'),
    });
  });

  it('rejects invalid exercise data and local date values', async () => {
    const request = plainToInstance(CreateWorkoutRecordDto, {
      exerciseName: '   ',
      weight: -1,
      sets: 0,
      reps: 1.5,
      date: '2026-13-01',
    });

    const errors = await validate(request);

    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(['exerciseName', 'weight', 'sets', 'reps', 'date']),
    );
    expect(recordWorkout).not.toHaveBeenCalled();
  });
});
