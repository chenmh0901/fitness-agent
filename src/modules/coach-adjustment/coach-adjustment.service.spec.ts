import {
  CoachAdjustmentRecommendationType,
  CoachAdjustmentStatus,
} from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { TrainingPlanVersionService } from '../coach-plan-version/training-plan-version.service';
import { CoachAdjustmentService } from './coach-adjustment.service';

describe('CoachAdjustmentService', () => {
  const findUserProfile = jest.fn();
  const findTrainingCycle = jest.fn();
  const findTrainingPlanVersion = jest.fn();
  const createAdjustment = jest.fn();
  const findAdjustment = jest.fn();
  const findAdjustmentHistory = jest.fn();
  const updateAdjustment = jest.fn();
  const updateUserProfile = jest.fn();
  const findUpdatedAdjustment = jest.fn();
  const runTransaction = jest.fn();
  const normalizeWorkoutPlan = jest.fn();
  const createNewVersionInTransaction = jest.fn();
  const transactionClient = {
    coachAdjustment: {
      updateMany: updateAdjustment,
      findUnique: findUpdatedAdjustment,
    },
    userProfile: {
      updateMany: updateUserProfile,
    },
  };
  const prisma = {
    userProfile: {
      findFirst: findUserProfile,
    },
    trainingCycle: {
      findFirst: findTrainingCycle,
    },
    trainingPlanVersion: {
      findFirst: findTrainingPlanVersion,
    },
    coachAdjustment: {
      create: createAdjustment,
      findFirst: findAdjustment,
      findMany: findAdjustmentHistory,
    },
    $transaction: runTransaction,
  } as unknown as PrismaService;
  const service = new CoachAdjustmentService(
    prisma,
    {
      normalizeWorkoutPlan,
      createNewVersionInTransaction,
    } as unknown as TrainingPlanVersionService,
  );
  const createdAt = new Date('2026-07-31T06:00:00.000Z');
  const updatedAt = new Date('2026-07-31T06:00:00.000Z');

  function adjustmentRecord(
    overrides: Record<string, unknown> = {},
  ): {
    id: string;
    userId: string;
    cycleId: string;
    recommendationType: CoachAdjustmentRecommendationType;
    oldValue: unknown;
    newValue: unknown;
    reason: string;
    status: CoachAdjustmentStatus;
    createdAt: Date;
    updatedAt: Date;
  } {
    return {
      id: 'adjustment-id',
      userId: 'profile-id',
      cycleId: 'cycle-id',
      recommendationType: CoachAdjustmentRecommendationType.NUTRITION_CALORIES,
      oldValue: { calories: 2200 },
      newValue: { calories: 2050 },
      reason: '减脂速度连续两周低于目标',
      status: CoachAdjustmentStatus.PENDING,
      createdAt,
      updatedAt,
      ...overrides,
    };
  }

  beforeEach(() => {
    findUserProfile.mockReset();
    findTrainingCycle.mockReset();
    findTrainingPlanVersion.mockReset();
    createAdjustment.mockReset();
    findAdjustment.mockReset();
    findAdjustmentHistory.mockReset();
    updateAdjustment.mockReset();
    updateUserProfile.mockReset();
    findUpdatedAdjustment.mockReset();
    runTransaction.mockReset();
    normalizeWorkoutPlan.mockReset();
    createNewVersionInTransaction.mockReset();
    normalizeWorkoutPlan.mockImplementation((workoutPlan: unknown) => workoutPlan);
    runTransaction.mockImplementation(
      (callback: (transaction: typeof transactionClient) => unknown) =>
        callback(transactionClient),
    );
  });

  it('creates a pending nutrition calorie proposal', async () => {
    const record = adjustmentRecord();
    findUserProfile.mockResolvedValue({ id: 'profile-id' });
    findTrainingCycle.mockResolvedValue({ id: 'cycle-id' });
    createAdjustment.mockResolvedValue(record);

    await expect(
      service.createProposal({
        cycleId: 'cycle-id',
        recommendationType: CoachAdjustmentRecommendationType.NUTRITION_CALORIES,
        oldValue: { calories: 2200 },
        newValue: { calories: 2050 },
        reason: '  减脂速度连续两周低于目标  ',
      }),
    ).resolves.toEqual(record);
    expect(findTrainingCycle).toHaveBeenCalledWith({
      where: {
        id: 'cycle-id',
        userProfileId: 'profile-id',
      },
      select: {
        id: true,
      },
    });
    expect(createAdjustment).toHaveBeenCalledWith({
      data: {
        userId: 'profile-id',
        cycleId: 'cycle-id',
        recommendationType: CoachAdjustmentRecommendationType.NUTRITION_CALORIES,
        oldValue: { calories: 2200 },
        newValue: { calories: 2050 },
        reason: '减脂速度连续两周低于目标',
        status: CoachAdjustmentStatus.PENDING,
      },
    });
  });

  it('accepts a pending calorie proposal and applies the confirmed target atomically', async () => {
    const pending = adjustmentRecord();
    const accepted = adjustmentRecord({
      status: CoachAdjustmentStatus.ACCEPTED,
      updatedAt: new Date('2026-07-31T07:00:00.000Z'),
    });
    findUserProfile.mockResolvedValue({ id: 'profile-id' });
    findAdjustment.mockResolvedValue(pending);
    updateAdjustment.mockResolvedValue({ count: 1 });
    updateUserProfile.mockResolvedValue({ count: 1 });
    findUpdatedAdjustment.mockResolvedValue(accepted);

    await expect(service.acceptAdjustment('adjustment-id')).resolves.toEqual(accepted);
    expect(updateAdjustment).toHaveBeenCalledWith({
      where: {
        id: 'adjustment-id',
        userId: 'profile-id',
        status: CoachAdjustmentStatus.PENDING,
      },
      data: {
        status: CoachAdjustmentStatus.ACCEPTED,
      },
    });
    expect(updateUserProfile).toHaveBeenCalledWith({
      where: {
        id: 'profile-id',
        dailyCaloriesTarget: 2200,
      },
      data: {
        dailyCaloriesTarget: 2050,
      },
    });
  });

  it('rejects a pending training RPE proposal without changing WorkoutPlan', async () => {
    const pending = adjustmentRecord({
      recommendationType: CoachAdjustmentRecommendationType.TRAINING_RPE,
      oldValue: { targetRpe: 9 },
      newValue: { targetRpe: 8 },
      reason: '近期疲劳偏高',
    });
    const rejected = {
      ...pending,
      status: CoachAdjustmentStatus.REJECTED,
    };
    findUserProfile.mockResolvedValue({ id: 'profile-id' });
    findAdjustment.mockResolvedValue(pending);
    updateAdjustment.mockResolvedValue({ count: 1 });
    findUpdatedAdjustment.mockResolvedValue(rejected);

    await expect(service.rejectAdjustment('adjustment-id')).resolves.toEqual(rejected);
    expect(updateAdjustment).toHaveBeenCalledWith({
      where: {
        id: 'adjustment-id',
        userId: 'profile-id',
        status: CoachAdjustmentStatus.PENDING,
      },
      data: {
        status: CoachAdjustmentStatus.REJECTED,
      },
    });
    expect(updateUserProfile).not.toHaveBeenCalled();
  });

  it('accepts a training RPE suggestion without changing WorkoutPlan or calorie target', async () => {
    const pending = adjustmentRecord({
      recommendationType: CoachAdjustmentRecommendationType.TRAINING_RPE,
      oldValue: { targetRpe: 9 },
      newValue: { targetRpe: 8 },
      reason: '近期疲劳偏高',
    });
    const accepted = {
      ...pending,
      status: CoachAdjustmentStatus.ACCEPTED,
    };
    findUserProfile.mockResolvedValue({ id: 'profile-id' });
    findAdjustment.mockResolvedValue(pending);
    updateAdjustment.mockResolvedValue({ count: 1 });
    findUpdatedAdjustment.mockResolvedValue(accepted);

    await expect(service.acceptAdjustment('adjustment-id')).resolves.toEqual(accepted);
    expect(updateUserProfile).not.toHaveBeenCalled();
  });

  it('accepts a training plan proposal by creating a new version in the same transaction', async () => {
    const workoutPlan = [
      {
        dayOfWeek: 'MONDAY',
        category: 'chest',
        exerciseName: 'barbell bench press',
        sets: 3,
        reps: 8,
        targetWeight: 80,
        targetRpe: 7,
        order: 1,
      },
    ];
    const pending = adjustmentRecord({
      recommendationType: CoachAdjustmentRecommendationType.TRAINING_PLAN,
      oldValue: { versionId: 'plan-version-1' },
      newValue: { workoutPlan },
      reason: 'high fatigue and declining performance',
    });
    const accepted = {
      ...pending,
      status: CoachAdjustmentStatus.ACCEPTED,
    };
    findUserProfile.mockResolvedValue({ id: 'profile-id' });
    findAdjustment.mockResolvedValue(pending);
    updateAdjustment.mockResolvedValue({ count: 1 });
    findUpdatedAdjustment.mockResolvedValue(accepted);
    createNewVersionInTransaction.mockResolvedValue({
      id: 'plan-version-2',
      versionNumber: 2,
    });

    await expect(service.acceptAdjustment('adjustment-id')).resolves.toEqual(accepted);
    expect(createNewVersionInTransaction).toHaveBeenCalledWith(transactionClient, {
      currentVersionId: 'plan-version-1',
      expectedTrainingCycleId: 'cycle-id',
      newWorkoutPlan: workoutPlan,
      reason: 'high fatigue and declining performance',
    });
    expect(updateUserProfile).not.toHaveBeenCalled();
  });

  it('creates a pending training plan proposal with a validated full plan snapshot', async () => {
    const workoutPlan = [
      {
        dayOfWeek: 'MONDAY',
        category: 'chest',
        exerciseName: 'barbell bench press',
        sets: 3,
        reps: 8,
        targetWeight: 80,
        targetRpe: 7,
        order: 1,
      },
    ];
    const record = adjustmentRecord({
      recommendationType: CoachAdjustmentRecommendationType.TRAINING_PLAN,
      oldValue: { versionId: 'plan-version-1' },
      newValue: { workoutPlan },
      reason: 'reduce training volume',
    });
    findUserProfile.mockResolvedValue({ id: 'profile-id' });
    findTrainingCycle.mockResolvedValue({ id: 'cycle-id' });
    findTrainingPlanVersion.mockResolvedValue({ id: 'plan-version-1' });
    createAdjustment.mockResolvedValue(record);

    await expect(
      service.createProposal({
        cycleId: 'cycle-id',
        recommendationType: CoachAdjustmentRecommendationType.TRAINING_PLAN,
        oldValue: { versionId: 'plan-version-1' },
        newValue: { workoutPlan },
        reason: 'reduce training volume',
      }),
    ).resolves.toEqual(record);
    expect(normalizeWorkoutPlan).toHaveBeenCalledWith(workoutPlan);
    expect(createAdjustment).toHaveBeenCalledWith({
      data: {
        userId: 'profile-id',
        cycleId: 'cycle-id',
        recommendationType: CoachAdjustmentRecommendationType.TRAINING_PLAN,
        oldValue: { versionId: 'plan-version-1' },
        newValue: { workoutPlan },
        reason: 'reduce training volume',
        status: CoachAdjustmentStatus.PENDING,
      },
    });
  });

  it('rejects a training plan proposal without creating a new version', async () => {
    const pending = adjustmentRecord({
      recommendationType: CoachAdjustmentRecommendationType.TRAINING_PLAN,
      oldValue: { versionId: 'plan-version-1' },
      newValue: { workoutPlan: [{ exerciseName: 'barbell bench press' }] },
      reason: 'high fatigue',
    });
    const rejected = {
      ...pending,
      status: CoachAdjustmentStatus.REJECTED,
    };
    findUserProfile.mockResolvedValue({ id: 'profile-id' });
    findAdjustment.mockResolvedValue(pending);
    updateAdjustment.mockResolvedValue({ count: 1 });
    findUpdatedAdjustment.mockResolvedValue(rejected);

    await expect(service.rejectAdjustment('adjustment-id')).resolves.toEqual(rejected);
    expect(createNewVersionInTransaction).not.toHaveBeenCalled();
  });

  it('returns recent adjustment history for the single user', async () => {
    const history = [
      adjustmentRecord({
        status: CoachAdjustmentStatus.REJECTED,
      }),
      adjustmentRecord({
        id: 'older-adjustment-id',
        status: CoachAdjustmentStatus.ACCEPTED,
      }),
    ];
    findUserProfile.mockResolvedValue({ id: 'profile-id' });
    findAdjustmentHistory.mockResolvedValue(history);

    await expect(service.getHistory()).resolves.toEqual(history);
    expect(findAdjustmentHistory).toHaveBeenCalledWith({
      where: {
        userId: 'profile-id',
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 20,
    });
  });

  it('prevents a terminal adjustment from being confirmed again', async () => {
    findUserProfile.mockResolvedValue({ id: 'profile-id' });
    findAdjustment.mockResolvedValue(
      adjustmentRecord({
        status: CoachAdjustmentStatus.ACCEPTED,
      }),
    );

    await expect(service.rejectAdjustment('adjustment-id')).rejects.toThrow(
      'Coach adjustment is already accepted',
    );
    expect(runTransaction).not.toHaveBeenCalled();
  });

  it('validates the supported proposal payload shape', async () => {
    await expect(
      service.createProposal({
        cycleId: 'cycle-id',
        recommendationType: CoachAdjustmentRecommendationType.TRAINING_RPE,
        oldValue: { targetRpe: 9 },
        newValue: { targetRpe: 11 },
        reason: '恢复不足',
      }),
    ).rejects.toThrow('targetRpe must be');
    expect(findUserProfile).not.toHaveBeenCalled();
  });
});
