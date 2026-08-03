import {
  DayOfWeek,
  FitnessGoalStatus,
  FitnessGoalType,
  ProfileFitnessGoal,
  TrainingCycleStatus,
  TrainingExperience,
  TrainingPlanVersionStatus,
} from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { TrainingPlanVersionService } from '../coach-plan-version/training-plan-version.service';
import { CoachPlanGeneratorService } from './coach-plan-generator.service';

describe('CoachPlanGeneratorService', () => {
  const findUserProfile = jest.fn();
  const findActiveGoal = jest.fn();
  const findActiveCycle = jest.fn();
  const createCycle = jest.fn();
  const findTemplate = jest.fn();
  const runTransaction = jest.fn();
  const createInitialVersionInTransaction = jest.fn();
  const transactionClient = {
    userProfile: { findFirst: findUserProfile },
    fitnessGoal: { findFirst: findActiveGoal },
    trainingCycle: {
      findFirst: findActiveCycle,
      create: createCycle,
    },
    trainingTemplate: { findUnique: findTemplate },
  };
  const prisma = {
    $transaction: runTransaction,
  } as unknown as PrismaService;
  const versionService = {
    createInitialVersionInTransaction,
  } as unknown as TrainingPlanVersionService;
  const service = new CoachPlanGeneratorService(prisma, versionService);
  const input = {
    goal: ProfileFitnessGoal.FAT_LOSS,
    experience: TrainingExperience.INTERMEDIATE,
    daysPerWeek: 5,
  };
  const startDate = new Date('2026-08-03T00:00:00.000Z');
  const endDate = new Date('2026-09-27T00:00:00.000Z');
  const createdAt = new Date('2026-08-03T02:00:00.000Z');

  beforeEach(() => {
    jest.clearAllMocks();
    runTransaction.mockImplementation(
      (callback: (transaction: typeof transactionClient) => unknown) =>
        callback(transactionClient),
    );
    findUserProfile.mockResolvedValue({
      id: 'user-id',
      goal: ProfileFitnessGoal.FAT_LOSS,
      trainingExperience: TrainingExperience.INTERMEDIATE,
      weeklyTrainingDays: 5,
    });
    findActiveGoal.mockResolvedValue({
      type: FitnessGoalType.FAT_LOSS,
      startDate,
      targetDate: endDate,
    });
    findActiveCycle.mockResolvedValue(null);
  });

  it('matches the template and generates an active cycle with version 1 workouts', async () => {
    const templateExercises = [
      {
        dayOfWeek: DayOfWeek.MONDAY,
        category: 'chest',
        sets: 4,
        reps: 8,
        targetWeight: null,
        targetRpe: { toNumber: () => 8 },
        order: 1,
        exercise: {
          id: 'exercise-id',
          name: 'barbell bench press',
        },
      },
      ...[DayOfWeek.TUESDAY, DayOfWeek.WEDNESDAY, DayOfWeek.THURSDAY, DayOfWeek.FRIDAY].map(
        (dayOfWeek, index) => ({
          dayOfWeek,
          category: index === 3 ? 'full_body' : 'training',
          sets: 3,
          reps: 10,
          targetWeight: null,
          targetRpe: { toNumber: () => 8 },
          order: 1,
          exercise: {
            id: `exercise-${index + 2}`,
            name: `exercise ${index + 2}`,
          },
        }),
      ),
    ];
    const cycle = {
      id: 'cycle-id',
      userProfileId: 'user-id',
      name: 'fat_loss_intermediate_5_days cycle',
      goal: ProfileFitnessGoal.FAT_LOSS,
      startDate,
      endDate,
      status: TrainingCycleStatus.ACTIVE,
      createdAt,
      updatedAt: createdAt,
    };
    const workouts = templateExercises.map((item, index) => ({
      id: `plan-${index + 1}`,
      exerciseId: item.exercise.id,
      dayOfWeek: item.dayOfWeek,
      category: item.category,
      exerciseName: item.exercise.name,
      sets: item.sets,
      reps: item.reps,
      targetWeight: null,
      targetRpe: 8,
      order: item.order,
    }));
    const version = {
      id: 'version-id',
      trainingCycleId: cycle.id,
      sourceTemplateId: 'template-id',
      sourceTemplate: {
        id: 'template-id',
        name: 'fat_loss_intermediate_5_days',
      },
      versionNumber: 1,
      status: TrainingPlanVersionStatus.ACTIVE,
      changeReason: 'Generated from template fat_loss_intermediate_5_days',
      createdFromVersionId: null,
      workoutPlans: workouts,
      createdAt,
      updatedAt: createdAt,
    };
    findTemplate.mockResolvedValue({
      id: 'template-id',
      name: 'fat_loss_intermediate_5_days',
      goal: input.goal,
      experience: input.experience,
      daysPerWeek: input.daysPerWeek,
      templateExercises,
    });
    createCycle.mockResolvedValue(cycle);
    createInitialVersionInTransaction.mockResolvedValue(version);

    const result = await service.generatePlan(input);

    expect(result.cycle).toMatchObject({
      id: 'cycle-id',
      status: TrainingCycleStatus.ACTIVE,
    });
    expect(result.version).toEqual(version);
    expect(result.workouts).toEqual(workouts);
    expect(findTemplate).toHaveBeenCalledWith({
      where: {
        goal_experience_daysPerWeek: input,
      },
      include: {
        templateExercises: {
          include: { exercise: true },
          orderBy: [{ dayOfWeek: 'asc' }, { order: 'asc' }],
        },
      },
    });
    expect(createInitialVersionInTransaction).toHaveBeenCalledWith(
      transactionClient,
      {
        trainingCycleId: 'cycle-id',
        sourceTemplateId: 'template-id',
        reason: 'Generated from template fat_loss_intermediate_5_days',
        workoutPlan: templateExercises.map((item) => ({
          exerciseId: item.exercise.id,
          dayOfWeek: item.dayOfWeek,
          category: item.category,
          exerciseName: item.exercise.name,
          sets: item.sets,
          reps: item.reps,
          targetWeight: null,
          targetRpe: 8,
          order: item.order,
        })),
      },
    );
    expect(version.versionNumber).toBe(1);
  });

  it('rejects generation when no exact template exists', async () => {
    findTemplate.mockResolvedValue(null);

    await expect(service.generatePlan(input)).rejects.toThrow(
      'No matching training template was found',
    );
    expect(createCycle).not.toHaveBeenCalled();
    expect(createInitialVersionInTransaction).not.toHaveBeenCalled();
  });

  it('rejects generation when an active cycle already exists', async () => {
    findActiveCycle.mockResolvedValue({ id: 'existing-cycle' });

    await expect(service.generatePlan(input)).rejects.toThrow(
      'An active training cycle already exists',
    );
    expect(findTemplate).not.toHaveBeenCalled();
  });

  it('rejects input that does not match the user profile', async () => {
    await expect(
      service.generatePlan({ ...input, daysPerWeek: 4 }),
    ).rejects.toThrow('Generation input must match the current user profile');
    expect(findActiveGoal).not.toHaveBeenCalled();
  });

  it('requires an active fitness goal', async () => {
    findActiveGoal.mockResolvedValue(null);

    await expect(service.generatePlan(input)).rejects.toThrow(
      'An active fitness goal is required',
    );
    expect(findTemplate).not.toHaveBeenCalled();
  });

  it('validates that a template contains the configured number of days', async () => {
    findTemplate.mockResolvedValue({
      id: 'template-id',
      name: 'fat_loss_intermediate_5_days',
      daysPerWeek: 5,
      templateExercises: [
        {
          dayOfWeek: DayOfWeek.MONDAY,
          exercise: { id: 'exercise-id', name: 'barbell bench press' },
        },
      ],
    });

    await expect(service.generatePlan(input)).rejects.toThrow(
      'The matching training template has an invalid schedule',
    );
    expect(createCycle).not.toHaveBeenCalled();
  });

  it('queries the active goal rather than using profile data as a substitute', async () => {
    findTemplate.mockResolvedValue(null);

    await expect(service.generatePlan(input)).rejects.toThrow();
    expect(findActiveGoal).toHaveBeenCalledWith({
      where: {
        userId: 'user-id',
        status: FitnessGoalStatus.ACTIVE,
      },
      select: {
        type: true,
        startDate: true,
        targetDate: true,
      },
      orderBy: [{ startDate: 'desc' }, { createdAt: 'desc' }],
    });
  });
});
