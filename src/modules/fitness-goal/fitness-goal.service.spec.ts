import {
  FitnessGoalPriority,
  FitnessGoalStatus,
  FitnessGoalType,
} from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { FitnessGoalService } from './fitness-goal.service';

describe('FitnessGoalService', () => {
  const findUserProfile = jest.fn();
  const findGoal = jest.fn();
  const createGoal = jest.fn();
  const updateGoal = jest.fn();
  const prisma = {
    userProfile: {
      findFirst: findUserProfile,
    },
    fitnessGoal: {
      findFirst: findGoal,
      create: createGoal,
      update: updateGoal,
    },
  } as unknown as PrismaService;
  const service = new FitnessGoalService(prisma);
  const input = {
    type: FitnessGoalType.FAT_LOSS,
    startWeight: 91.7,
    targetWeight: 85,
    targetBodyFat: 16,
    startDate: new Date('2026-08-01T00:00:00.000Z'),
    targetDate: new Date('2026-09-26T00:00:00.000Z'),
    durationWeeks: 8,
    priority: FitnessGoalPriority.KEEP_STRENGTH,
  };
  const goalRecord = {
    id: 'goal-id',
    userId: 'profile-id',
    ...input,
    startWeight: { toNumber: () => input.startWeight },
    targetWeight: { toNumber: () => input.targetWeight },
    targetBodyFat: { toNumber: () => input.targetBodyFat },
    status: FitnessGoalStatus.ACTIVE,
    createdAt: new Date('2026-08-01T01:00:00.000Z'),
    updatedAt: new Date('2026-08-01T01:00:00.000Z'),
  };

  beforeEach(() => {
    findUserProfile.mockReset();
    findGoal.mockReset();
    createGoal.mockReset();
    updateGoal.mockReset();
  });

  it('creates an active goal for the configured single user', async () => {
    findUserProfile.mockResolvedValue({ id: 'profile-id' });
    findGoal.mockResolvedValue(null);
    createGoal.mockResolvedValue(goalRecord);

    await expect(service.createGoal(input)).resolves.toEqual({
      id: 'goal-id',
      userId: 'profile-id',
      ...input,
      status: FitnessGoalStatus.ACTIVE,
      createdAt: goalRecord.createdAt,
      updatedAt: goalRecord.updatedAt,
    });
    expect(createGoal).toHaveBeenCalledWith({
      data: {
        userId: 'profile-id',
        ...input,
        status: FitnessGoalStatus.ACTIVE,
      },
    });
  });

  it('rejects an invalid goal date range before accessing Prisma', async () => {
    await expect(
      service.createGoal({
        ...input,
        targetDate: input.startDate,
      }),
    ).rejects.toThrow('targetDate must be after startDate');
    expect(findUserProfile).not.toHaveBeenCalled();
  });

  it('rejects creating a second active goal', async () => {
    findUserProfile.mockResolvedValue({ id: 'profile-id' });
    findGoal.mockResolvedValue({ id: 'existing-goal-id' });

    await expect(service.createGoal(input)).rejects.toMatchObject({
      status: 409,
      message: 'An active fitness goal already exists',
    });
    expect(createGoal).not.toHaveBeenCalled();
  });

  it('gets the active goal', async () => {
    findUserProfile.mockResolvedValue({ id: 'profile-id' });
    findGoal.mockResolvedValue({
      ...goalRecord,
      targetBodyFat: null,
    });

    await expect(service.getActiveGoal()).resolves.toMatchObject({
      id: 'goal-id',
      type: FitnessGoalType.FAT_LOSS,
      startWeight: 91.7,
      targetWeight: 85,
      targetBodyFat: null,
      status: FitnessGoalStatus.ACTIVE,
    });
    expect(findGoal).toHaveBeenCalledWith({
      where: {
        userId: 'profile-id',
        status: FitnessGoalStatus.ACTIVE,
      },
      orderBy: [{ startDate: 'desc' }, { createdAt: 'desc' }],
    });
  });

  it.each([
    ['missing profile', null, undefined],
    ['missing goal', { id: 'profile-id' }, null],
  ])('returns null for %s', async (_case, userProfile, goal) => {
    findUserProfile.mockResolvedValue(userProfile);
    findGoal.mockResolvedValue(goal);

    await expect(service.getActiveGoal()).resolves.toBeNull();
  });

  it('completes the active goal', async () => {
    findUserProfile.mockResolvedValue({ id: 'profile-id' });
    findGoal.mockResolvedValue(goalRecord);
    updateGoal.mockResolvedValue({
      ...goalRecord,
      status: FitnessGoalStatus.COMPLETED,
    });

    await expect(service.completeGoal()).resolves.toMatchObject({
      id: 'goal-id',
      status: FitnessGoalStatus.COMPLETED,
    });
    expect(updateGoal).toHaveBeenCalledWith({
      where: {
        id: 'goal-id',
      },
      data: {
        status: FitnessGoalStatus.COMPLETED,
      },
    });
  });

  it('returns null when completing without an active goal', async () => {
    findUserProfile.mockResolvedValue({ id: 'profile-id' });
    findGoal.mockResolvedValue(null);

    await expect(service.completeGoal()).resolves.toBeNull();
    expect(updateGoal).not.toHaveBeenCalled();
  });

  it('rejects goal creation without a configured user profile', async () => {
    findUserProfile.mockResolvedValue(null);

    await expect(service.createGoal(input)).rejects.toThrow('User profile is not configured');
  });
});
