import { Injectable } from '@nestjs/common';
import { startOfRecentDayWindow } from '../../common/utils/date.util';
import { roundTo } from '../../common/utils/number.util';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateNutritionRecordDto } from './dto/create-nutrition-record.dto';
import { NutritionRecordDto } from './dto/nutrition-record.dto';
import { NutritionSummaryDto } from './dto/nutrition-summary.dto';

@Injectable()
export class NutritionService {
  constructor(private readonly prisma: PrismaService) {}

  async createRecord(input: CreateNutritionRecordDto): Promise<NutritionRecordDto> {
    const userId = await this.getSingleUserId();
    const record = await this.prisma.nutritionRecord.upsert({
      where: {
        userId_date: {
          userId,
          date: input.date,
        },
      },
      create: {
        userId,
        date: input.date,
        calories: input.calories,
        protein: input.protein,
        carbs: input.carbs,
        fat: input.fat,
        notes: input.notes,
      },
      update: {
        calories: input.calories,
        protein: input.protein,
        carbs: input.carbs,
        fat: input.fat,
        notes: input.notes,
      },
    });

    return this.toDto(record);
  }

  async getRecentNutrition(days: number): Promise<NutritionSummaryDto | null> {
    const startDate = startOfRecentDayWindow(days);
    const records = await this.prisma.nutritionRecord.findMany({
      where: {
        date: {
          gte: startDate,
        },
      },
      orderBy: {
        date: 'desc',
      },
    });

    if (records.length === 0) {
      return null;
    }

    const recentNutrition = records.map((record) => this.toDto(record));
    const recordCount = records.length;

    return {
      days,
      recordCount,
      recentNutrition,
      averageCalories: roundTo(
        records.reduce((total, record) => total + record.calories, 0) / recordCount,
      ),
      averageProtein: roundTo(
        records.reduce((total, record) => total + record.protein.toNumber(), 0) / recordCount,
      ),
      averageCarbs: roundTo(
        records.reduce((total, record) => total + record.carbs.toNumber(), 0) / recordCount,
      ),
      averageFat: roundTo(
        records.reduce((total, record) => total + record.fat.toNumber(), 0) / recordCount,
      ),
    };
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

  private toDto(record: {
    id: string;
    userId: string;
    date: Date;
    calories: number;
    protein: { toNumber(): number };
    carbs: { toNumber(): number };
    fat: { toNumber(): number };
    notes: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): NutritionRecordDto {
    return {
      id: record.id,
      userId: record.userId,
      date: record.date,
      calories: record.calories,
      protein: record.protein.toNumber(),
      carbs: record.carbs.toNumber(),
      fat: record.fat.toNumber(),
      notes: record.notes,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }
}
