import { WeightRecordType } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { WeightTrendDirection } from './dto/weight-trend.dto';
import { WeightService } from './weight.service';

describe('WeightService', () => {
  const findMany = jest.fn();
  const findUserProfile = jest.fn();
  const upsertWeightRecord = jest.fn();
  const updateUserProfile = jest.fn();
  const runTransaction = jest.fn();
  const transactionClient = {
    weightRecord: {
      upsert: upsertWeightRecord,
    },
    userProfile: {
      update: updateUserProfile,
    },
  };
  const prisma = {
    userProfile: {
      findFirst: findUserProfile,
    },
    weightRecord: {
      findMany,
    },
    $transaction: runTransaction,
  } as unknown as PrismaService;
  const service = new WeightService(prisma);

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
    upsertWeightRecord.mockReset();
    updateUserProfile.mockReset();
    runTransaction.mockReset();
    runTransaction.mockImplementation(
      (callback: (transaction: typeof transactionClient) => unknown) => callback(transactionClient),
    );
  });

  it('upserts a single-user weight record and updates the current weight snapshot', async () => {
    const date = new Date(2026, 6, 29);
    const createdAt = new Date('2026-07-29T01:00:00.000Z');
    const updatedAt = new Date('2026-07-29T01:00:00.000Z');
    findUserProfile.mockResolvedValue({ id: 'profile-id' });
    upsertWeightRecord.mockResolvedValue({
      id: 'weight-id',
      userProfileId: 'profile-id',
      weight: { toNumber: () => 90.5 },
      recordType: WeightRecordType.MORNING,
      date,
      createdAt,
      updatedAt,
    });
    updateUserProfile.mockResolvedValue({ id: 'profile-id' });

    await expect(
      service.recordWeight({
        weight: 90.5,
        recordType: WeightRecordType.MORNING,
        date,
      }),
    ).resolves.toEqual({
      id: 'weight-id',
      weight: 90.5,
      recordType: WeightRecordType.MORNING,
      date,
      createdAt,
      updatedAt,
    });
    expect(findUserProfile).toHaveBeenCalledWith({
      select: {
        id: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
    expect(upsertWeightRecord).toHaveBeenCalledWith({
      where: {
        userProfileId_date_recordType: {
          userProfileId: 'profile-id',
          date,
          recordType: WeightRecordType.MORNING,
        },
      },
      create: {
        userProfileId: 'profile-id',
        weight: 90.5,
        recordType: WeightRecordType.MORNING,
        date,
      },
      update: {
        weight: 90.5,
      },
    });
    expect(updateUserProfile).toHaveBeenCalledWith({
      where: {
        id: 'profile-id',
      },
      data: {
        currentWeight: 90.5,
      },
    });
  });

  it('rejects a weight write when the single user profile is missing', async () => {
    findUserProfile.mockResolvedValue(null);

    await expect(
      service.recordWeight({
        weight: 90.5,
        recordType: WeightRecordType.MORNING,
        date: new Date(2026, 6, 29),
      }),
    ).rejects.toThrow('User profile is not configured');
    expect(runTransaction).not.toHaveBeenCalled();
  });

  it('returns recent morning and evening records as DTOs', async () => {
    const date = new Date(2026, 6, 28);
    const createdAt = new Date('2026-07-28T01:00:00.000Z');
    const updatedAt = new Date('2026-07-28T01:00:00.000Z');
    findMany.mockResolvedValue([
      {
        id: 'weight-id',
        userProfileId: 'profile-id',
        weight: { toNumber: () => 75.4 },
        recordType: WeightRecordType.EVENING,
        date,
        createdAt,
        updatedAt,
      },
    ]);

    await expect(service.getRecentWeightRecords(7)).resolves.toEqual([
      {
        id: 'weight-id',
        weight: 75.4,
        recordType: WeightRecordType.EVENING,
        date,
        createdAt,
        updatedAt,
      },
    ]);
    expect(findMany).toHaveBeenCalledWith({
      where: {
        date: {
          gte: new Date(2026, 6, 22),
        },
      },
      orderBy: [{ date: 'desc' }, { recordType: 'asc' }],
    });
  });

  it('calculates average and decreasing trend from morning records only', async () => {
    findMany.mockResolvedValue([
      {
        date: new Date(2026, 6, 22),
        weight: { toNumber: () => 80.2 },
      },
      {
        date: new Date(2026, 6, 25),
        weight: { toNumber: () => 79.8 },
      },
      {
        date: new Date(2026, 6, 28),
        weight: { toNumber: () => 79.6 },
      },
    ]);

    await expect(service.getWeightTrend(7)).resolves.toEqual({
      days: 7,
      recordCount: 3,
      averageWeight: 79.87,
      firstWeight: 80.2,
      latestWeight: 79.6,
      minWeight: 79.6,
      maxWeight: 80.2,
      weightRange: 0.6,
      volatility: 0.25,
      weeklyAverageChange: -0.7,
      change: -0.6,
      trend: WeightTrendDirection.DECREASING,
    });
    expect(findMany).toHaveBeenCalledWith({
      where: {
        date: {
          gte: new Date(2026, 6, 22),
        },
        recordType: WeightRecordType.MORNING,
      },
      orderBy: {
        date: 'asc',
      },
    });
  });

  it('marks changes within 0.1 kg as stable', async () => {
    findMany.mockResolvedValue([
      {
        date: new Date(2026, 6, 27),
        weight: { toNumber: () => 80 },
      },
      {
        date: new Date(2026, 6, 28),
        weight: { toNumber: () => 80.05 },
      },
    ]);

    await expect(service.getWeightTrend(7)).resolves.toMatchObject({
      change: 0.05,
      trend: WeightTrendDirection.STABLE,
    });
  });

  it('returns an explicit no-data trend', async () => {
    findMany.mockResolvedValue([]);

    await expect(service.getWeightTrend(14)).resolves.toEqual({
      days: 14,
      recordCount: 0,
      averageWeight: null,
      firstWeight: null,
      latestWeight: null,
      minWeight: null,
      maxWeight: null,
      weightRange: null,
      volatility: null,
      weeklyAverageChange: null,
      change: null,
      trend: WeightTrendDirection.INSUFFICIENT_DATA,
    });
  });

  it('keeps range fields but marks rate and volatility unavailable for one record', async () => {
    findMany.mockResolvedValue([
      {
        date: new Date(2026, 6, 28),
        weight: { toNumber: () => 79.4 },
      },
    ]);

    await expect(service.getWeightTrend(7)).resolves.toEqual({
      days: 7,
      recordCount: 1,
      averageWeight: 79.4,
      firstWeight: 79.4,
      latestWeight: 79.4,
      minWeight: 79.4,
      maxWeight: 79.4,
      weightRange: 0,
      volatility: null,
      weeklyAverageChange: null,
      change: 0,
      trend: WeightTrendDirection.INSUFFICIENT_DATA,
    });
  });

  it('returns null weekly change when multiple records share one calendar date', async () => {
    const date = new Date(2026, 6, 28);
    findMany.mockResolvedValue([
      { date, weight: { toNumber: () => 80 } },
      { date, weight: { toNumber: () => 79.8 } },
    ]);

    await expect(service.getWeightTrend(7)).resolves.toMatchObject({
      weeklyAverageChange: null,
      volatility: 0.1,
    });
  });

  it('rejects invalid day windows before querying Prisma', async () => {
    await expect(service.getRecentWeightRecords(0)).rejects.toThrow(
      'days must be a positive integer',
    );
    expect(findMany).not.toHaveBeenCalled();
  });
});
