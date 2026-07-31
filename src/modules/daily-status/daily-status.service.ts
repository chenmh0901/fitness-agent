import { Injectable } from '@nestjs/common';
import { startOfLocalDay } from '../../common/utils/date.util';
import { DailyStatus as DailyStatusRecord } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateDailyStatusDto } from './dto/create-daily-status.dto';
import { DailyStatusDto } from './dto/daily-status.dto';

@Injectable()
export class DailyStatusService {
  constructor(private readonly prisma: PrismaService) {}

  async createStatus(input: CreateDailyStatusDto): Promise<DailyStatusDto> {
    const userId = await this.getSingleUserId();
    const status = await this.prisma.dailyStatus.upsert({
      where: {
        userId_date: {
          userId,
          date: input.date,
        },
      },
      create: {
        userId,
        date: input.date,
        energyLevel: input.energyLevel,
        fatigueLevel: input.fatigueLevel,
        muscleSoreness: input.muscleSoreness,
        stressLevel: input.stressLevel,
        notes: input.notes,
      },
      update: {
        energyLevel: input.energyLevel,
        fatigueLevel: input.fatigueLevel,
        muscleSoreness: input.muscleSoreness,
        stressLevel: input.stressLevel,
        notes: input.notes,
      },
    });

    return this.toDto(status);
  }

  async getTodayStatus(): Promise<DailyStatusDto | null> {
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

    const status = await this.prisma.dailyStatus.findUnique({
      where: {
        userId_date: {
          userId: userProfile.id,
          date: startOfLocalDay(),
        },
      },
    });

    return status ? this.toDto(status) : null;
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

  private toDto(status: DailyStatusRecord): DailyStatusDto {
    return {
      id: status.id,
      userId: status.userId,
      date: status.date,
      energyLevel: status.energyLevel,
      fatigueLevel: status.fatigueLevel,
      muscleSoreness: status.muscleSoreness,
      stressLevel: status.stressLevel,
      notes: status.notes,
      createdAt: status.createdAt,
      updatedAt: status.updatedAt,
    };
  }
}
