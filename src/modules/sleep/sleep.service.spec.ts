import { PrismaService } from '../../prisma/prisma.service';
import { SleepStatus } from './dto/sleep-summary.dto';
import { SleepService } from './sleep.service';

describe('SleepService', () => {
  const findMany = jest.fn();
  const findUserProfile = jest.fn();
  const upsertSleepRecord = jest.fn();
  const prisma = {
    userProfile: {
      findFirst: findUserProfile,
    },
    sleepRecord: {
      findMany,
      upsert: upsertSleepRecord,
    },
  } as unknown as PrismaService;
  const service = new SleepService(prisma);

  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 6, 28, 12));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    findMany.mockReset();
    findUserProfile.mockReset();
    upsertSleepRecord.mockReset();
  });

  it('upserts a sleep record for the single user and returns a DTO', async () => {
    const date = new Date(2026, 6, 28);
    const createdAt = new Date('2026-07-29T01:00:00.000Z');
    const updatedAt = new Date('2026-07-29T01:00:00.000Z');
    findUserProfile.mockResolvedValue({ id: 'profile-id' });
    upsertSleepRecord.mockResolvedValue({
      id: 'sleep-id',
      userProfileId: 'profile-id',
      date,
      durationMinutes: 360,
      quality: 3,
      notes: null,
      createdAt,
      updatedAt,
    });

    await expect(
      service.recordSleep({
        durationMinutes: 360,
        quality: 3,
        date,
      }),
    ).resolves.toEqual({
      id: 'sleep-id',
      date,
      durationMinutes: 360,
      quality: 3,
      notes: null,
      createdAt,
      updatedAt,
    });
    expect(upsertSleepRecord).toHaveBeenCalledWith({
      where: {
        userProfileId_date: {
          userProfileId: 'profile-id',
          date,
        },
      },
      create: {
        userProfileId: 'profile-id',
        durationMinutes: 360,
        quality: 3,
        date,
      },
      update: {
        durationMinutes: 360,
        quality: 3,
      },
    });
  });

  it('rejects a sleep write when the single user profile is missing', async () => {
    findUserProfile.mockResolvedValue(null);

    await expect(
      service.recordSleep({
        durationMinutes: 360,
        quality: 3,
        date: new Date(2026, 6, 28),
      }),
    ).rejects.toThrow('User profile is not configured');
    expect(upsertSleepRecord).not.toHaveBeenCalled();
  });

  it('returns recent sleep, averages, and a good status', async () => {
    const firstDate = new Date(2026, 6, 28);
    const secondDate = new Date(2026, 6, 27);
    const timestamp = new Date('2026-07-28T01:00:00.000Z');
    findMany.mockResolvedValue([
      {
        id: 'sleep-1',
        userProfileId: 'profile-id',
        date: firstDate,
        durationMinutes: 450,
        quality: 4,
        notes: null,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      {
        id: 'sleep-2',
        userProfileId: 'profile-id',
        date: secondDate,
        durationMinutes: 420,
        quality: 3,
        notes: 'Woke once',
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    ]);

    const result = await service.getRecentSleep(7);

    expect(result).toEqual({
      days: 7,
      recordCount: 2,
      recentSleep: [
        {
          id: 'sleep-1',
          date: firstDate,
          durationMinutes: 450,
          quality: 4,
          notes: null,
          createdAt: timestamp,
          updatedAt: timestamp,
        },
        {
          id: 'sleep-2',
          date: secondDate,
          durationMinutes: 420,
          quality: 3,
          notes: 'Woke once',
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      ],
      averageDurationMinutes: 435,
      averageQuality: 3.5,
      status: SleepStatus.GOOD,
    });
    expect(findMany).toHaveBeenCalledWith({
      where: {
        date: {
          gte: new Date(2026, 6, 22),
        },
      },
      orderBy: {
        date: 'desc',
      },
    });
  });

  it('identifies combined short-duration and low-quality status', async () => {
    findMany.mockResolvedValue([
      {
        id: 'sleep-1',
        date: new Date(2026, 6, 28),
        durationMinutes: 360,
        quality: 2,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    await expect(service.getRecentSleep(7)).resolves.toMatchObject({
      averageDurationMinutes: 360,
      averageQuality: 2,
      status: SleepStatus.SHORT_DURATION_AND_LOW_QUALITY,
    });
  });

  it('returns an explicit no-data state', async () => {
    findMany.mockResolvedValue([]);

    await expect(service.getRecentSleep(7)).resolves.toEqual({
      days: 7,
      recordCount: 0,
      recentSleep: [],
      averageDurationMinutes: null,
      averageQuality: null,
      status: SleepStatus.NO_DATA,
    });
  });

  it('rejects invalid day windows before querying Prisma', async () => {
    await expect(service.getRecentSleep(1.5)).rejects.toThrow('days must be a positive integer');
    expect(findMany).not.toHaveBeenCalled();
  });
});
