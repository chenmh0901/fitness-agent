import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UserProfileDto } from './dto/user-profile.dto';

@Injectable()
export class UserProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(): Promise<UserProfileDto | null> {
    const profile = await this.prisma.userProfile.findFirst({
      orderBy: {
        createdAt: 'asc',
      },
    });

    if (!profile) {
      return null;
    }

    return {
      id: profile.id,
      heightCm: profile.heightCm.toNumber(),
      currentWeight: profile.currentWeight.toNumber(),
      goal: profile.goal,
      trainingExperience: profile.trainingExperience,
      weeklyTrainingDays: profile.weeklyTrainingDays,
      dailyCaloriesTarget: profile.dailyCaloriesTarget,
      proteinTarget: profile.proteinTarget,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    };
  }
}
