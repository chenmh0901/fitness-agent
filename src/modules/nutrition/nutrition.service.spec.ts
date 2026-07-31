import { PrismaService } from '../../prisma/prisma.service';
import { NutritionService } from './nutrition.service';

describe('NutritionService', () => {
  const findUserProfile = jest.fn();
  const upsertNutrition = jest.fn();
  const findNutrition = jest.fn();
  const prisma = {
    userProfile: {
      findFirst: findUserProfile,
    },
    nutritionRecord: {
      upsert: upsertNutrition,
      findMany: findNutrition,
    },
  } as unknown as PrismaService;
  const service = new NutritionService(prisma);

  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 7, 1, 12));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    findUserProfile.mockReset();
    upsertNutrition.mockReset();
    findNutrition.mockReset();
  });

  it('upserts a daily nutrition record for the single user', async () => {
    const date = new Date('2026-08-01T00:00:00.000Z');
    const createdAt = new Date('2026-08-01T01:00:00.000Z');
    findUserProfile.mockResolvedValue({ id: 'profile-id' });
    upsertNutrition.mockResolvedValue({
      id: 'nutrition-id',
      userId: 'profile-id',
      date,
      calories: 2200,
      protein: { toNumber: () => 160 },
      carbs: { toNumber: () => 250 },
      fat: { toNumber: () => 60 },
      notes: 'training day',
      createdAt,
      updatedAt: createdAt,
    });

    await expect(
      service.createRecord({
        calories: 2200,
        protein: 160,
        carbs: 250,
        fat: 60,
        notes: 'training day',
        date,
      }),
    ).resolves.toEqual({
      id: 'nutrition-id',
      userId: 'profile-id',
      date,
      calories: 2200,
      protein: 160,
      carbs: 250,
      fat: 60,
      notes: 'training day',
      createdAt,
      updatedAt: createdAt,
    });
    expect(upsertNutrition).toHaveBeenCalledWith({
      where: {
        userId_date: {
          userId: 'profile-id',
          date,
        },
      },
      create: {
        userId: 'profile-id',
        date,
        calories: 2200,
        protein: 160,
        carbs: 250,
        fat: 60,
        notes: 'training day',
      },
      update: {
        calories: 2200,
        protein: 160,
        carbs: 250,
        fat: 60,
        notes: 'training day',
      },
    });
  });

  it('aggregates recent nutrition averages', async () => {
    const recordBase = {
      userId: 'profile-id',
      notes: null,
      createdAt: new Date('2026-08-01T01:00:00.000Z'),
      updatedAt: new Date('2026-08-01T01:00:00.000Z'),
    };
    findNutrition.mockResolvedValue([
      {
        ...recordBase,
        id: 'nutrition-2',
        date: new Date(2026, 7, 1),
        calories: 2200,
        protein: { toNumber: () => 160 },
        carbs: { toNumber: () => 250 },
        fat: { toNumber: () => 60 },
      },
      {
        ...recordBase,
        id: 'nutrition-1',
        date: new Date(2026, 6, 31),
        calories: 2000,
        protein: { toNumber: () => 150 },
        carbs: { toNumber: () => 220 },
        fat: { toNumber: () => 55 },
      },
    ]);

    await expect(service.getRecentNutrition(7)).resolves.toMatchObject({
      days: 7,
      recordCount: 2,
      averageCalories: 2100,
      averageProtein: 155,
      averageCarbs: 235,
      averageFat: 57.5,
    });
    expect(findNutrition).toHaveBeenCalledWith({
      where: {
        date: {
          gte: new Date(2026, 6, 26),
        },
      },
      orderBy: {
        date: 'desc',
      },
    });
  });

  it('returns null when recent nutrition data is missing', async () => {
    findNutrition.mockResolvedValue([]);

    await expect(service.getRecentNutrition(7)).resolves.toBeNull();
  });

  it('rejects a nutrition write without a configured profile', async () => {
    findUserProfile.mockResolvedValue(null);

    await expect(
      service.createRecord({
        calories: 2200,
        protein: 160,
        carbs: 250,
        fat: 60,
        date: new Date(2026, 7, 1),
      }),
    ).rejects.toThrow('User profile is not configured');
    expect(upsertNutrition).not.toHaveBeenCalled();
  });

  it('rejects an invalid recent window', async () => {
    await expect(service.getRecentNutrition(0)).rejects.toThrow('days must be a positive integer');
    expect(findNutrition).not.toHaveBeenCalled();
  });
});
