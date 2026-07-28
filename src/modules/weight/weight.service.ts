import { Injectable } from '@nestjs/common';
import { WeightRecordType } from '../../generated/prisma/client';
import { startOfRecentDayWindow } from '../../common/utils/date.util';
import { roundTo } from '../../common/utils/number.util';
import { PrismaService } from '../../prisma/prisma.service';
import { WeightRecordDto } from './dto/weight-record.dto';
import { WeightTrendDirection, WeightTrendDto } from './dto/weight-trend.dto';

const STABLE_WEIGHT_THRESHOLD_KG = 0.1;

@Injectable()
export class WeightService {
  constructor(private readonly prisma: PrismaService) {}

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
        change: null,
        trend: WeightTrendDirection.INSUFFICIENT_DATA,
      };
    }

    const weights = records.map((record) => record.weight.toNumber());
    const firstWeight = weights[0];
    const latestWeight = weights.at(-1) ?? firstWeight;
    const averageWeight = roundTo(
      weights.reduce((total, weight) => total + weight, 0) / weights.length,
    );

    if (weights.length === 1) {
      return {
        days,
        recordCount: 1,
        averageWeight,
        firstWeight,
        latestWeight,
        change: 0,
        trend: WeightTrendDirection.INSUFFICIENT_DATA,
      };
    }

    const change = roundTo(latestWeight - firstWeight);

    return {
      days,
      recordCount: weights.length,
      averageWeight,
      firstWeight,
      latestWeight,
      change,
      trend: this.getTrendDirection(change),
    };
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
