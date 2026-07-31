import { PrismaService } from '../../prisma/prisma.service';
import { DailyStatusService } from './daily-status.service';

describe('DailyStatusService', () => {
  const findUserProfile = jest.fn();
  const upsertStatus = jest.fn();
  const findStatus = jest.fn();
  const prisma = {
    userProfile: {
      findFirst: findUserProfile,
    },
    dailyStatus: {
      upsert: upsertStatus,
      findUnique: findStatus,
    },
  } as unknown as PrismaService;
  const service = new DailyStatusService(prisma);
  const date = new Date(2026, 7, 1);
  const statusRecord = {
    id: 'status-id',
    userId: 'profile-id',
    date,
    energyLevel: 7,
    fatigueLevel: 3,
    muscleSoreness: 2,
    stressLevel: 4,
    notes: null,
    createdAt: new Date('2026-08-01T01:00:00.000Z'),
    updatedAt: new Date('2026-08-01T01:00:00.000Z'),
  };

  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 7, 1, 12));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    findUserProfile.mockReset();
    upsertStatus.mockReset();
    findStatus.mockReset();
  });

  it('upserts the daily subjective status', async () => {
    findUserProfile.mockResolvedValue({ id: 'profile-id' });
    upsertStatus.mockResolvedValue(statusRecord);

    await expect(
      service.createStatus({
        energyLevel: 7,
        fatigueLevel: 3,
        muscleSoreness: 2,
        stressLevel: 4,
        date,
      }),
    ).resolves.toEqual(statusRecord);
    expect(upsertStatus).toHaveBeenCalledWith({
      where: {
        userId_date: {
          userId: 'profile-id',
          date,
        },
      },
      create: {
        userId: 'profile-id',
        date,
        energyLevel: 7,
        fatigueLevel: 3,
        muscleSoreness: 2,
        stressLevel: 4,
        notes: undefined,
      },
      update: {
        energyLevel: 7,
        fatigueLevel: 3,
        muscleSoreness: 2,
        stressLevel: 4,
        notes: undefined,
      },
    });
  });

  it('returns today status', async () => {
    findUserProfile.mockResolvedValue({ id: 'profile-id' });
    findStatus.mockResolvedValue(statusRecord);

    await expect(service.getTodayStatus()).resolves.toEqual(statusRecord);
    expect(findStatus).toHaveBeenCalledWith({
      where: {
        userId_date: {
          userId: 'profile-id',
          date,
        },
      },
    });
  });

  it.each([
    ['missing profile', null, undefined],
    ['missing status', { id: 'profile-id' }, null],
  ])('returns null for %s', async (_case, userProfile, status) => {
    findUserProfile.mockResolvedValue(userProfile);
    findStatus.mockResolvedValue(status);

    await expect(service.getTodayStatus()).resolves.toBeNull();
  });

  it('rejects a write without a configured profile', async () => {
    findUserProfile.mockResolvedValue(null);

    await expect(
      service.createStatus({
        energyLevel: 7,
        fatigueLevel: 3,
        muscleSoreness: 2,
        stressLevel: 4,
        date,
      }),
    ).rejects.toThrow('User profile is not configured');
    expect(upsertStatus).not.toHaveBeenCalled();
  });
});
