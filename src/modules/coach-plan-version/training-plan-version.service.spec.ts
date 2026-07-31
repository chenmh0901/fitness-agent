import {
  DayOfWeek,
  TrainingCycleStatus,
  TrainingPlanVersionStatus,
} from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { TrainingPlanVersionService } from './training-plan-version.service';

describe('TrainingPlanVersionService', () => {
  const findCycleById = jest.fn();
  const findCurrentCycle = jest.fn();
  const findVersion = jest.fn();
  const findVersions = jest.fn();
  const createVersion = jest.fn();
  const aggregateVersions = jest.fn();
  const archiveVersion = jest.fn();
  const createWorkoutPlans = jest.fn();
  const runTransaction = jest.fn();
  const transactionClient = {
    trainingCycle: {
      findUnique: findCycleById,
    },
    trainingPlanVersion: {
      findFirst: findVersion,
      findUnique: findVersion,
      create: createVersion,
      aggregate: aggregateVersions,
      updateMany: archiveVersion,
    },
    workoutPlan: {
      createMany: createWorkoutPlans,
    },
  };
  const prisma = {
    trainingCycle: {
      findFirst: findCurrentCycle,
    },
    trainingPlanVersion: {
      findFirst: findVersion,
      findMany: findVersions,
    },
    $transaction: runTransaction,
  } as unknown as PrismaService;
  const service = new TrainingPlanVersionService(prisma);
  const createdAt = new Date('2026-07-31T08:00:00.000Z');
  const updatedAt = new Date('2026-07-31T08:00:00.000Z');
  const workoutPlan = [
    {
      dayOfWeek: DayOfWeek.MONDAY,
      category: 'chest',
      exerciseName: 'barbell bench press',
      sets: 4,
      reps: 8,
      targetWeight: 80,
      targetRpe: 8,
      order: 1,
    },
  ];

  function versionRecord(
    overrides: Record<string, unknown> = {},
  ): {
    id: string;
    trainingCycleId: string;
    versionNumber: number;
    status: TrainingPlanVersionStatus;
    changeReason: string;
    createdFromVersionId: string | null;
    workoutPlans: Array<Record<string, unknown>>;
    createdAt: Date;
    updatedAt: Date;
  } {
    return {
      id: 'version-1',
      trainingCycleId: 'cycle-id',
      versionNumber: 1,
      status: TrainingPlanVersionStatus.ACTIVE,
      changeReason: 'Initial training plan',
      createdFromVersionId: null,
      workoutPlans: [
        {
          id: 'plan-id',
          ...workoutPlan[0],
          targetWeight: { toNumber: () => 80 },
          targetRpe: { toNumber: () => 8 },
        },
      ],
      createdAt,
      updatedAt,
      ...overrides,
    };
  }

  beforeEach(() => {
    findCycleById.mockReset();
    findCurrentCycle.mockReset();
    findVersion.mockReset();
    findVersions.mockReset();
    createVersion.mockReset();
    aggregateVersions.mockReset();
    archiveVersion.mockReset();
    createWorkoutPlans.mockReset();
    runTransaction.mockReset();
    runTransaction.mockImplementation(
      (callback: (transaction: typeof transactionClient) => unknown) =>
        callback(transactionClient),
    );
  });

  it('creates version 1 with the initial workout plan', async () => {
    const version = versionRecord();
    findCycleById.mockResolvedValue({ id: 'cycle-id' });
    findVersion.mockResolvedValueOnce(null).mockResolvedValueOnce(version);
    createVersion.mockResolvedValue({
      id: 'version-1',
      trainingCycleId: 'cycle-id',
      versionNumber: 1,
      status: TrainingPlanVersionStatus.ACTIVE,
    });
    createWorkoutPlans.mockResolvedValue({ count: 1 });

    await expect(
      service.createInitialVersion({
        trainingCycleId: 'cycle-id',
        workoutPlan,
      }),
    ).resolves.toMatchObject({
      id: 'version-1',
      versionNumber: 1,
      status: TrainingPlanVersionStatus.ACTIVE,
      workoutPlans: [
        expect.objectContaining({
          exerciseName: 'barbell bench press',
          targetWeight: 80,
          targetRpe: 8,
        }),
      ],
    });
    expect(createVersion).toHaveBeenCalledWith({
      data: {
        trainingCycleId: 'cycle-id',
        versionNumber: 1,
        status: TrainingPlanVersionStatus.ACTIVE,
        changeReason: 'Initial training plan',
      },
    });
    expect(createWorkoutPlans).toHaveBeenCalledWith({
      data: [
        {
          ...workoutPlan[0],
          trainingPlanVersionId: 'version-1',
        },
      ],
    });
  });

  it('archives the current version and creates the next active version', async () => {
    const currentVersion = versionRecord();
    const newVersion = versionRecord({
      id: 'version-2',
      versionNumber: 2,
      changeReason: 'reduce fatigue',
      createdFromVersionId: 'version-1',
    });
    findVersion
      .mockResolvedValueOnce(currentVersion)
      .mockResolvedValueOnce(newVersion);
    aggregateVersions.mockResolvedValue({
      _max: {
        versionNumber: 1,
      },
    });
    archiveVersion.mockResolvedValue({ count: 1 });
    createVersion.mockResolvedValue({
      id: 'version-2',
      trainingCycleId: 'cycle-id',
      versionNumber: 2,
      status: TrainingPlanVersionStatus.ACTIVE,
    });
    createWorkoutPlans.mockResolvedValue({ count: 1 });

    await expect(
      service.createNewVersion({
        currentVersionId: 'version-1',
        newWorkoutPlan: [
          {
            ...workoutPlan[0],
            sets: 3,
            targetRpe: 7,
          },
        ],
        reason: '  reduce fatigue  ',
      }),
    ).resolves.toMatchObject({
      id: 'version-2',
      versionNumber: 2,
      status: TrainingPlanVersionStatus.ACTIVE,
      createdFromVersionId: 'version-1',
    });
    expect(archiveVersion).toHaveBeenCalledWith({
      where: {
        id: 'version-1',
        status: TrainingPlanVersionStatus.ACTIVE,
      },
      data: {
        status: TrainingPlanVersionStatus.ARCHIVED,
      },
    });
    expect(createVersion).toHaveBeenCalledWith({
      data: {
        trainingCycleId: 'cycle-id',
        versionNumber: 2,
        status: TrainingPlanVersionStatus.ACTIVE,
        changeReason: 'reduce fatigue',
        createdFromVersionId: 'version-1',
      },
    });
  });

  it('rejects a version that belongs to a different training cycle', async () => {
    findVersion.mockResolvedValue(versionRecord());

    await expect(
      service.createNewVersionInTransaction(transactionClient as never, {
        currentVersionId: 'version-1',
        expectedTrainingCycleId: 'another-cycle-id',
        newWorkoutPlan: workoutPlan,
        reason: 'reduce fatigue',
      }),
    ).rejects.toThrow(
      'Training plan version does not belong to the adjustment cycle',
    );
    expect(archiveVersion).not.toHaveBeenCalled();
    expect(createVersion).not.toHaveBeenCalled();
  });

  it('returns the current active version and plan', async () => {
    const version = versionRecord();
    findCurrentCycle.mockResolvedValue({ id: 'cycle-id' });
    findVersion.mockResolvedValue(version);

    await expect(service.getActiveVersion()).resolves.toMatchObject({
      id: 'version-1',
      versionNumber: 1,
      workoutPlans: [
        expect.objectContaining({
          id: 'plan-id',
        }),
      ],
    });
    expect(findCurrentCycle).toHaveBeenCalledWith({
      where: {
        status: TrainingCycleStatus.ACTIVE,
      },
      select: {
        id: true,
      },
      orderBy: {
        startDate: 'desc',
      },
    });
    expect(findVersion).toHaveBeenCalledWith({
      where: {
        trainingCycleId: 'cycle-id',
        status: TrainingPlanVersionStatus.ACTIVE,
      },
      include: {
        workoutPlans: {
          orderBy: [{ dayOfWeek: 'asc' }, { order: 'asc' }],
        },
      },
      orderBy: {
        versionNumber: 'desc',
      },
    });
  });

  it('returns all versions newest first and derives recent changes', async () => {
    const version2 = versionRecord({
      id: 'version-2',
      versionNumber: 2,
      status: TrainingPlanVersionStatus.ACTIVE,
      changeReason: 'reduce fatigue',
      createdFromVersionId: 'version-1',
    });
    const version1 = versionRecord({
      status: TrainingPlanVersionStatus.ARCHIVED,
    });
    findCurrentCycle.mockResolvedValue({ id: 'cycle-id' });
    findVersions.mockResolvedValue([version2, version1]);

    const history = await service.getVersionHistory();

    expect(history.map(({ versionNumber }) => versionNumber)).toEqual([2, 1]);
    expect(service.getRecentPlanChanges(history)).toEqual([
      {
        fromVersion: 1,
        toVersion: 2,
        reason: 'reduce fatigue',
        createdAt,
      },
    ]);
    expect(findVersions).toHaveBeenCalledWith({
      where: {
        trainingCycleId: 'cycle-id',
      },
      include: {
        workoutPlans: {
          orderBy: [{ dayOfWeek: 'asc' }, { order: 'asc' }],
        },
      },
      orderBy: {
        versionNumber: 'desc',
      },
    });
  });
});
