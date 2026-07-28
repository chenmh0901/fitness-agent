import { DayOfWeek, FitnessGoal, TrainingCycleStatus } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { WorkoutService } from './workout.service';

describe('WorkoutService', () => {
  const findTrainingCycle = jest.fn();
  const findWorkoutPlans = jest.fn();
  const findExerciseRecords = jest.fn();
  const prisma = {
    trainingCycle: {
      findFirst: findTrainingCycle,
    },
    workoutPlan: {
      findMany: findWorkoutPlans,
    },
    workoutExerciseRecord: {
      findMany: findExerciseRecords,
    },
  } as unknown as PrismaService;
  const service = new WorkoutService(prisma);

  const cycle = {
    id: 'cycle-id',
    userProfileId: 'profile-id',
    name: 'Fat loss cycle 1',
    goal: FitnessGoal.FAT_LOSS,
    startDate: new Date(2026, 6, 1),
    endDate: new Date(2026, 7, 31),
    status: TrainingCycleStatus.ACTIVE,
    createdAt: new Date('2026-06-25T00:00:00.000Z'),
    updatedAt: new Date('2026-06-25T00:00:00.000Z'),
  };

  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 6, 28, 12));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    findTrainingCycle.mockReset();
    findWorkoutPlans.mockReset();
    findExerciseRecords.mockReset();
  });

  it('returns the active cycle for today', async () => {
    findTrainingCycle.mockResolvedValue(cycle);

    await expect(service.getCurrentTrainingCycle()).resolves.toEqual({
      id: cycle.id,
      name: cycle.name,
      goal: cycle.goal,
      startDate: cycle.startDate,
      endDate: cycle.endDate,
      status: cycle.status,
      createdAt: cycle.createdAt,
      updatedAt: cycle.updatedAt,
    });
    expect(findTrainingCycle).toHaveBeenCalledWith({
      where: {
        status: TrainingCycleStatus.ACTIVE,
        startDate: {
          lte: new Date(2026, 6, 28),
        },
        endDate: {
          gte: new Date(2026, 6, 28),
        },
      },
      orderBy: {
        startDate: 'desc',
      },
    });
  });

  it('returns the ordered plan for the current weekday', async () => {
    findTrainingCycle.mockResolvedValue(cycle);
    findWorkoutPlans.mockResolvedValue([
      {
        id: 'plan-id',
        category: 'chest',
        exerciseName: 'barbell bench press',
        sets: 4,
        reps: 8,
        targetWeight: { toNumber: () => 80 },
        targetRpe: { toNumber: () => 8 },
        order: 1,
      },
    ]);

    await expect(service.getTodayWorkout()).resolves.toEqual({
      date: new Date(2026, 6, 28),
      dayOfWeek: DayOfWeek.TUESDAY,
      trainingCycle: {
        id: cycle.id,
        name: cycle.name,
        goal: cycle.goal,
        startDate: cycle.startDate,
        endDate: cycle.endDate,
        status: cycle.status,
        createdAt: cycle.createdAt,
        updatedAt: cycle.updatedAt,
      },
      exercises: [
        {
          id: 'plan-id',
          category: 'chest',
          exerciseName: 'barbell bench press',
          sets: 4,
          reps: 8,
          targetWeight: 80,
          targetRpe: 8,
          order: 1,
        },
      ],
    });
    expect(findWorkoutPlans).toHaveBeenCalledWith({
      where: {
        trainingCycleId: cycle.id,
        dayOfWeek: DayOfWeek.TUESDAY,
      },
      orderBy: {
        order: 'asc',
      },
    });
  });

  it('returns null for today when there is no active cycle', async () => {
    findTrainingCycle.mockResolvedValue(null);

    await expect(service.getTodayWorkout()).resolves.toBeNull();
    expect(findWorkoutPlans).not.toHaveBeenCalled();
  });

  it('returns recent completed exercise performance as DTOs', async () => {
    const date = new Date(2026, 6, 27);
    findExerciseRecords.mockResolvedValue([
      {
        id: 'record-id',
        workoutSessionId: 'session-id',
        exerciseName: 'barbell bench press',
        actualWeight: { toNumber: () => 82.5 },
        sets: 4,
        reps: 8,
        rpe: { toNumber: () => 8.5 },
        completed: true,
        workoutSession: {
          date,
          category: 'chest',
        },
      },
    ]);

    await expect(service.getRecentExercisePerformance()).resolves.toEqual([
      {
        id: 'record-id',
        workoutSessionId: 'session-id',
        date,
        category: 'chest',
        exerciseName: 'barbell bench press',
        actualWeight: 82.5,
        sets: 4,
        reps: 8,
        rpe: 8.5,
        completed: true,
      },
    ]);
    expect(findExerciseRecords).toHaveBeenCalledWith({
      where: {
        completed: true,
      },
      include: {
        workoutSession: {
          select: {
            date: true,
            category: true,
          },
        },
      },
      orderBy: [{ workoutSession: { date: 'desc' } }, { createdAt: 'desc' }],
      take: 50,
    });
  });
});
