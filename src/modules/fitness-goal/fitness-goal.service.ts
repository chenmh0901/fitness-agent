import { ConflictException, Injectable } from '@nestjs/common';
import { FitnessGoal as FitnessGoalRecord, FitnessGoalStatus } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateFitnessGoalDto } from './dto/create-fitness-goal.dto';
import { FitnessGoalDto } from './dto/fitness-goal.dto';

@Injectable()
export class FitnessGoalService {
  constructor(private readonly prisma: PrismaService) {}

  async createGoal(input: CreateFitnessGoalDto): Promise<FitnessGoalDto> {
    if (input.targetDate <= input.startDate) {
      throw new RangeError('targetDate must be after startDate');
    }

    const userId = await this.getSingleUserId();
    const activeGoal = await this.prisma.fitnessGoal.findFirst({
      where: {
        userId,
        status: FitnessGoalStatus.ACTIVE,
      },
      select: {
        id: true,
      },
    });

    if (activeGoal) {
      throw new ConflictException('An active fitness goal already exists');
    }

    const goal = await this.prisma.fitnessGoal.create({
      data: {
        userId,
        type: input.type,
        startWeight: input.startWeight,
        targetWeight: input.targetWeight,
        targetBodyFat: input.targetBodyFat,
        startDate: input.startDate,
        targetDate: input.targetDate,
        durationWeeks: input.durationWeeks,
        priority: input.priority,
        status: FitnessGoalStatus.ACTIVE,
      },
    });

    return this.toDto(goal);
  }

  async getActiveGoal(): Promise<FitnessGoalDto | null> {
    const userProfile = await this.prisma.userProfile.findFirst({
      select: {
        id: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    if (!userProfile) {
      return null;
    }

    const goal = await this.prisma.fitnessGoal.findFirst({
      where: {
        userId: userProfile.id,
        status: FitnessGoalStatus.ACTIVE,
      },
      orderBy: [{ startDate: 'desc' }, { createdAt: 'desc' }],
    });

    return goal ? this.toDto(goal) : null;
  }

  async completeGoal(): Promise<FitnessGoalDto | null> {
    const activeGoal = await this.getActiveGoal();

    if (!activeGoal) {
      return null;
    }

    const goal = await this.prisma.fitnessGoal.update({
      where: {
        id: activeGoal.id,
      },
      data: {
        status: FitnessGoalStatus.COMPLETED,
      },
    });

    return this.toDto(goal);
  }

  private async getSingleUserId(): Promise<string> {
    const userProfile = await this.prisma.userProfile.findFirst({
      select: {
        id: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    if (!userProfile) {
      throw new Error('User profile is not configured');
    }

    return userProfile.id;
  }

  private toDto(goal: FitnessGoalRecord): FitnessGoalDto {
    return {
      id: goal.id,
      userId: goal.userId,
      type: goal.type,
      startWeight: goal.startWeight.toNumber(),
      targetWeight: goal.targetWeight.toNumber(),
      targetBodyFat: goal.targetBodyFat?.toNumber() ?? null,
      startDate: goal.startDate,
      targetDate: goal.targetDate,
      durationWeeks: goal.durationWeeks,
      priority: goal.priority,
      status: goal.status,
      createdAt: goal.createdAt,
      updatedAt: goal.updatedAt,
    };
  }
}
