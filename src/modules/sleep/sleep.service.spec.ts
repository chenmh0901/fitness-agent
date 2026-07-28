import { PrismaService } from '../../prisma/prisma.service';
import { SleepStatus } from './dto/sleep-summary.dto';
import { SleepService } from './sleep.service';

describe('SleepService', () => {
  const findMany = jest.fn();
  const prisma = {
    sleepRecord: {
      findMany,
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
