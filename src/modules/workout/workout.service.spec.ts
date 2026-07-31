import {
  DayOfWeek,
  ProfileFitnessGoal,
  TrainingCycleStatus,
  TrainingPlanVersionStatus,
} from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ExerciseProgressTrend } from './dto/exercise-performance.dto';
import { WorkoutService } from './workout.service';

describe('WorkoutService', () => {
  const findTrainingCycle = jest.fn();
  const findWorkoutPlans = jest.fn();
  const findExerciseRecords = jest.fn();
  const findWorkoutSessions = jest.fn();
  const findUserProfile = jest.fn();
  const createWorkoutSession = jest.fn();
  const createExerciseRecord = jest.fn();
  const runTransaction = jest.fn();
  const transactionClient = {
    workoutSession: {
      create: createWorkoutSession,
    },
    workoutExerciseRecord: {
      create: createExerciseRecord,
    },
  };
  const prisma = {
    userProfile: {
      findFirst: findUserProfile,
    },
    trainingCycle: {
      findFirst: findTrainingCycle,
    },
    workoutPlan: {
      findMany: findWorkoutPlans,
    },
    workoutExerciseRecord: {
      findMany: findExerciseRecords,
    },
    workoutSession: {
      findMany: findWorkoutSessions,
    },
    $transaction: runTransaction,
  } as unknown as PrismaService;
  const service = new WorkoutService(prisma);

  const cycle = {
    id: 'cycle-id',
    userProfileId: 'profile-id',
    name: 'Fat loss cycle 1',
    goal: ProfileFitnessGoal.FAT_LOSS,
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
    findWorkoutSessions.mockReset();
    findUserProfile.mockReset();
    createWorkoutSession.mockReset();
    createExerciseRecord.mockReset();
    runTransaction.mockReset();
    runTransaction.mockImplementation(
      (callback: (transaction: typeof transactionClient) => unknown) => callback(transactionClient),
    );
  });

  it('creates a workout session and exercise record for the single user', async () => {
    const date = new Date(2026, 6, 29);
    findUserProfile.mockResolvedValue({ id: 'profile-id' });
    createWorkoutSession.mockResolvedValue({
      id: 'session-id',
      userProfileId: 'profile-id',
      date,
      category: 'strength',
    });
    createExerciseRecord.mockResolvedValue({
      id: 'exercise-id',
      workoutSessionId: 'session-id',
      exerciseName: 'barbell bench press',
      actualWeight: { toNumber: () => 80 },
      sets: 4,
      reps: 8,
      rpe: null,
      completed: true,
    });

    await expect(
      service.recordWorkout({
        exerciseName: 'barbell bench press',
        weight: 80,
        sets: 4,
        reps: 8,
        date,
      }),
    ).resolves.toEqual({
      id: 'exercise-id',
      workoutSessionId: 'session-id',
      date,
      category: 'strength',
      exerciseName: 'barbell bench press',
      actualWeight: 80,
      sets: 4,
      reps: 8,
      rpe: null,
      completed: true,
      averageRpe: null,
      lastWeight: 80,
      lastSets: 4,
      lastReps: 8,
      lastRpe: null,
      progressTrend: ExerciseProgressTrend.INSUFFICIENT_DATA,
    });
    expect(createWorkoutSession).toHaveBeenCalledWith({
      data: {
        userProfileId: 'profile-id',
        date,
        category: 'strength',
      },
    });
    expect(createExerciseRecord).toHaveBeenCalledWith({
      data: {
        workoutSessionId: 'session-id',
        exerciseName: 'barbell bench press',
        actualWeight: 80,
        sets: 4,
        reps: 8,
        rpe: null,
        completed: true,
      },
    });
  });

  it('saves RPE and completion state for workout feedback', async () => {
    const date = new Date(2026, 6, 30);
    findUserProfile.mockResolvedValue({ id: 'profile-id' });
    createWorkoutSession.mockResolvedValue({
      id: 'session-id',
      userProfileId: 'profile-id',
      date,
      category: 'strength',
    });
    createExerciseRecord.mockResolvedValue({
      id: 'exercise-id',
      workoutSessionId: 'session-id',
      exerciseName: 'barbell bench press',
      actualWeight: { toNumber: () => 80 },
      sets: 4,
      reps: 8,
      rpe: { toNumber: () => 9 },
      completed: true,
    });

    await expect(
      service.recordWorkoutFeedback({
        exerciseName: 'barbell bench press',
        weight: 80,
        sets: 4,
        reps: 8,
        rpe: 9,
        completed: true,
        date,
      }),
    ).resolves.toMatchObject({
      exerciseName: 'barbell bench press',
      actualWeight: 80,
      rpe: 9,
      completed: true,
      lastWeight: 80,
      lastSets: 4,
      lastReps: 8,
      lastRpe: 9,
    });
    expect(createExerciseRecord).toHaveBeenCalledWith({
      data: {
        workoutSessionId: 'session-id',
        exerciseName: 'barbell bench press',
        actualWeight: 80,
        sets: 4,
        reps: 8,
        rpe: 9,
        completed: true,
      },
    });
  });

  it('rejects a workout write when the single user profile is missing', async () => {
    findUserProfile.mockResolvedValue(null);

    await expect(
      service.recordWorkout({
        exerciseName: 'barbell bench press',
        weight: 80,
        sets: 4,
        reps: 8,
        date: new Date(2026, 6, 29),
      }),
    ).rejects.toThrow('User profile is not configured');
    expect(runTransaction).not.toHaveBeenCalled();
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
        trainingPlanVersion: {
          trainingCycleId: cycle.id,
          status: TrainingPlanVersionStatus.ACTIVE,
        },
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

  it('calculates training adherence from distinct planned and completed session dates', async () => {
    findTrainingCycle.mockResolvedValue(cycle);
    findWorkoutPlans.mockResolvedValue([
      { dayOfWeek: DayOfWeek.MONDAY },
      { dayOfWeek: DayOfWeek.TUESDAY },
      { dayOfWeek: DayOfWeek.THURSDAY },
      { dayOfWeek: DayOfWeek.FRIDAY },
    ]);
    findWorkoutSessions.mockResolvedValue([
      { date: new Date(2026, 6, 24) },
      { date: new Date(2026, 6, 27) },
    ]);

    await expect(service.getTrainingAdherence(7)).resolves.toEqual({
      days: 7,
      plannedSessions: 4,
      completedSessions: 2,
      adherenceRate: 50,
    });
    expect(findWorkoutPlans).toHaveBeenCalledWith({
      where: {
        trainingPlanVersion: {
          trainingCycleId: cycle.id,
          status: TrainingPlanVersionStatus.ACTIVE,
        },
      },
      select: {
        dayOfWeek: true,
      },
      distinct: ['dayOfWeek'],
    });
    expect(findWorkoutSessions).toHaveBeenCalledWith({
      where: {
        userProfileId: cycle.userProfileId,
        date: {
          gte: new Date(2026, 6, 22),
          lte: new Date(2026, 6, 28),
        },
        exerciseRecords: {
          some: {
            completed: true,
          },
        },
      },
      select: {
        date: true,
      },
      distinct: ['date'],
    });
  });

  it('returns insufficient adherence data when no active cycle exists', async () => {
    findTrainingCycle.mockResolvedValue(null);

    await expect(service.getTrainingAdherence()).resolves.toEqual({
      days: 7,
      plannedSessions: 0,
      completedSessions: 0,
      adherenceRate: null,
    });
    expect(findWorkoutPlans).not.toHaveBeenCalled();
    expect(findWorkoutSessions).not.toHaveBeenCalled();
  });

  it('summarizes unchanged weight as stable and averages RPE by exercise', async () => {
    const latestDate = new Date(2026, 6, 30);
    const previousDate = new Date(2026, 6, 27);
    findExerciseRecords.mockResolvedValue([
      {
        id: 'latest-record-id',
        workoutSessionId: 'latest-session-id',
        exerciseName: 'barbell bench press',
        actualWeight: { toNumber: () => 80 },
        sets: 4,
        reps: 8,
        rpe: { toNumber: () => 8 },
        completed: true,
        workoutSession: {
          date: latestDate,
          category: 'chest',
        },
      },
      {
        id: 'previous-record-id',
        workoutSessionId: 'previous-session-id',
        exerciseName: 'Barbell Bench Press',
        actualWeight: { toNumber: () => 80 },
        sets: 4,
        reps: 8,
        rpe: { toNumber: () => 8 },
        completed: true,
        workoutSession: {
          date: previousDate,
          category: 'chest',
        },
      },
    ]);

    await expect(service.getRecentExercisePerformance()).resolves.toEqual([
      {
        id: 'latest-record-id',
        workoutSessionId: 'latest-session-id',
        date: latestDate,
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
    ]);
    expect(findExerciseRecords).toHaveBeenCalledWith({
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

  it('marks an increased exercise weight as improving', async () => {
    findExerciseRecords.mockResolvedValue([
      {
        id: 'latest-record-id',
        workoutSessionId: 'latest-session-id',
        exerciseName: 'barbell bench press',
        actualWeight: { toNumber: () => 80 },
        sets: 4,
        reps: 8,
        rpe: { toNumber: () => 9 },
        completed: true,
        workoutSession: {
          date: new Date(2026, 6, 30),
          category: 'chest',
        },
      },
      {
        id: 'previous-record-id',
        workoutSessionId: 'previous-session-id',
        exerciseName: 'barbell bench press',
        actualWeight: { toNumber: () => 70 },
        sets: 4,
        reps: 8,
        rpe: { toNumber: () => 8 },
        completed: true,
        workoutSession: {
          date: new Date(2026, 6, 23),
          category: 'chest',
        },
      },
    ]);

    await expect(service.getRecentExercisePerformance()).resolves.toEqual([
      expect.objectContaining({
        exerciseName: 'barbell bench press',
        lastWeight: 80,
        lastRpe: 9,
        averageRpe: 8.5,
        progressTrend: ExerciseProgressTrend.IMPROVING,
      }),
    ]);
  });

  it('marks a drop from completed to incomplete as declining', async () => {
    findExerciseRecords.mockResolvedValue([
      {
        id: 'latest-record-id',
        workoutSessionId: 'latest-session-id',
        exerciseName: 'barbell bench press',
        actualWeight: { toNumber: () => 80 },
        sets: 4,
        reps: 8,
        rpe: { toNumber: () => 10 },
        completed: false,
        workoutSession: {
          date: new Date(2026, 6, 30),
          category: 'chest',
        },
      },
      {
        id: 'previous-record-id',
        workoutSessionId: 'previous-session-id',
        exerciseName: 'barbell bench press',
        actualWeight: { toNumber: () => 80 },
        sets: 4,
        reps: 8,
        rpe: { toNumber: () => 8 },
        completed: true,
        workoutSession: {
          date: new Date(2026, 6, 23),
          category: 'chest',
        },
      },
    ]);

    await expect(service.getRecentExercisePerformance()).resolves.toEqual([
      expect.objectContaining({
        completed: false,
        progressTrend: ExerciseProgressTrend.DECLINING,
      }),
    ]);
  });
});
