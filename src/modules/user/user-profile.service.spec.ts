import { ProfileFitnessGoal, TrainingExperience } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { UserProfileService } from './user-profile.service';

describe('UserProfileService', () => {
  const findFirst = jest.fn();
  const prisma = {
    userProfile: {
      findFirst,
    },
  } as unknown as PrismaService;
  const service = new UserProfileService(prisma);

  beforeEach(() => {
    findFirst.mockReset();
  });

  it('returns the single profile as a stable DTO', async () => {
    const createdAt = new Date('2026-01-01T00:00:00.000Z');
    const updatedAt = new Date('2026-01-02T00:00:00.000Z');
    findFirst.mockResolvedValue({
      id: 'profile-id',
      heightCm: { toNumber: () => 178.5 },
      currentWeight: { toNumber: () => 75.2 },
      goal: ProfileFitnessGoal.FAT_LOSS,
      trainingExperience: TrainingExperience.INTERMEDIATE,
      weeklyTrainingDays: 4,
      dailyCaloriesTarget: 2200,
      proteinTarget: 150,
      createdAt,
      updatedAt,
    });

    await expect(service.getProfile()).resolves.toEqual({
      id: 'profile-id',
      heightCm: 178.5,
      currentWeight: 75.2,
      goal: ProfileFitnessGoal.FAT_LOSS,
      trainingExperience: TrainingExperience.INTERMEDIATE,
      weeklyTrainingDays: 4,
      dailyCaloriesTarget: 2200,
      proteinTarget: 150,
      createdAt,
      updatedAt,
    });
    expect(findFirst).toHaveBeenCalledWith({
      orderBy: {
        createdAt: 'asc',
      },
    });
  });

  it('returns null when no profile exists', async () => {
    findFirst.mockResolvedValue(null);

    await expect(service.getProfile()).resolves.toBeNull();
  });
});
