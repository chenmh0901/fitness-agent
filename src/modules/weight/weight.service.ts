import { Injectable } from '@nestjs/common';
import { WeightRecordType } from '../../generated/prisma/client';
import { startOfRecentDayWindow } from '../../common/utils/date.util';
import { roundTo } from '../../common/utils/number.util';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateWeightRecordDto } from './dto/create-weight-record.dto';
import { WeightRecordDto } from './dto/weight-record.dto';
import { WeightTrendDirection, WeightTrendDto } from './dto/weight-trend.dto';

const STABLE_WEIGHT_THRESHOLD_KG = 0.1;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

@Injectable()
export class WeightService {
  constructor(private readonly prisma: PrismaService) {}

  async recordWeight(input: CreateWeightRecordDto): Promise<WeightRecordDto> {
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

    const record = await this.prisma.$transaction(async (transaction) => {
      const savedRecord = await transaction.weightRecord.upsert({
        where: {
          userProfileId_date_recordType: {
            userProfileId: userProfile.id,
            date: input.date,
            recordType: input.recordType,
          },
        },
        create: {
          userProfileId: userProfile.id,
          weight: input.weight,
          recordType: input.recordType,
          date: input.date,
        },
        update: {
          weight: input.weight,
        },
      });

      await transaction.userProfile.update({
        where: {
          id: userProfile.id,
        },
        data: {
          currentWeight: input.weight,
        },
      });

      return savedRecord;
    });

    return {
      id: record.id,
      weight: record.weight.toNumber(),
      recordType: record.recordType,
      date: record.date,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }

  async getRecentWeightRecords(days: number): Promise<WeightRecordDto[]> {
    const startDate = startOfRecentDayWindow(days);
    const records = await this.prisma.weightRecord.findMany({
      where: {
        date: {
          gte: startDate,
        },
      },
      orderBy: [{ date: 'desc' }, { recordType: 'asc' }],
    });

    return records.map((record) => ({
      id: record.id,
      weight: record.weight.toNumber(),
      recordType: record.recordType,
      date: record.date,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    }));
  }

  async getWeightTrend(days: number): Promise<WeightTrendDto> {
    const startDate = startOfRecentDayWindow(days);
    const records = await this.prisma.weightRecord.findMany({
      where: {
        date: {
          gte: startDate,
        },
        recordType: WeightRecordType.MORNING,
      },
      orderBy: {
        date: 'asc',
      },
    });

    if (records.length === 0) {
      return {
        days,
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
      };
    }

    const weights = records.map((record) => record.weight.toNumber());
    const firstWeight = weights[0];
    const latestWeight = weights.at(-1) ?? firstWeight;
    const rawAverageWeight = weights.reduce((total, weight) => total + weight, 0) / weights.length;
    const averageWeight = roundTo(rawAverageWeight);
    const minWeight = Math.min(...weights);
    const maxWeight = Math.max(...weights);
    const weightRange = roundTo(maxWeight - minWeight);

    if (weights.length === 1) {
      return {
        days,
        recordCount: 1,
        averageWeight,
        firstWeight,
        latestWeight,
        minWeight,
        maxWeight,
        weightRange,
        volatility: null,
        weeklyAverageChange: null,
        change: 0,
        trend: WeightTrendDirection.INSUFFICIENT_DATA,
      };
    }

    const rawChange = latestWeight - firstWeight;
    const change = roundTo(rawChange);
    const volatility = roundTo(
      Math.sqrt(
        weights.reduce((total, weight) => total + (weight - rawAverageWeight) ** 2, 0) /
          weights.length,
      ),
    );
    const firstRecordDate = records[0].date;
    const latestRecordDate = records.at(-1)?.date ?? firstRecordDate;
    const elapsedDays = this.getCalendarDayDifference(firstRecordDate, latestRecordDate);
    const weeklyAverageChange = elapsedDays > 0 ? roundTo((rawChange / elapsedDays) * 7) : null;

    return {
      days,
      recordCount: weights.length,
      averageWeight,
      firstWeight,
      latestWeight,
      minWeight,
      maxWeight,
      weightRange,
      volatility,
      weeklyAverageChange,
      change,
      trend: this.getTrendDirection(change),
    };
  }

  private getCalendarDayDifference(firstDate: Date, latestDate: Date): number {
    const firstDay = Date.UTC(firstDate.getFullYear(), firstDate.getMonth(), firstDate.getDate());
    const latestDay = Date.UTC(
      latestDate.getFullYear(),
      latestDate.getMonth(),
      latestDate.getDate(),
    );

    return Math.round((latestDay - firstDay) / MILLISECONDS_PER_DAY);
  }

  private getTrendDirection(change: number): WeightTrendDirection {
    if (change > STABLE_WEIGHT_THRESHOLD_KG) {
      return WeightTrendDirection.INCREASING;
    }

    if (change < -STABLE_WEIGHT_THRESHOLD_KG) {
      return WeightTrendDirection.DECREASING;
    }

    return WeightTrendDirection.STABLE;
  }
}
