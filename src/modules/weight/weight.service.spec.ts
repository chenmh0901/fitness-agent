import { WeightRecordType } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { WeightTrendDirection } from './dto/weight-trend.dto';
import { WeightService } from './weight.service';

describe('WeightService', () => {
  const findMany = jest.fn();
  const prisma = {
    weightRecord: {
      findMany,
    },
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
      { weight: { toNumber: () => 80.2 } },
      { weight: { toNumber: () => 79.8 } },
      { weight: { toNumber: () => 79.6 } },
    ]);

    await expect(service.getWeightTrend(7)).resolves.toEqual({
      days: 7,
      recordCount: 3,
      averageWeight: 79.87,
      firstWeight: 80.2,
      latestWeight: 79.6,
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
      { weight: { toNumber: () => 80 } },
      { weight: { toNumber: () => 80.05 } },
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
      change: null,
      trend: WeightTrendDirection.INSUFFICIENT_DATA,
    });
  });

  it('rejects invalid day windows before querying Prisma', async () => {
    await expect(service.getRecentWeightRecords(0)).rejects.toThrow(
      'days must be a positive integer',
    );
    expect(findMany).not.toHaveBeenCalled();
  });
});
