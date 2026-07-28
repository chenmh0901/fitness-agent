import { Injectable } from '@nestjs/common';
import { startOfRecentDayWindow } from '../../common/utils/date.util';
import { roundTo } from '../../common/utils/number.util';
import { PrismaService } from '../../prisma/prisma.service';
import { SleepStatus, SleepSummaryDto } from './dto/sleep-summary.dto';

const GOOD_SLEEP_DURATION_MINUTES = 7 * 60;
const GOOD_SLEEP_QUALITY = 3;

@Injectable()
export class SleepService {
  constructor(private readonly prisma: PrismaService) {}

  async getRecentSleep(days: number): Promise<SleepSummaryDto> {
    const startDate = startOfRecentDayWindow(days);
    const records = await this.prisma.sleepRecord.findMany({
      where: {
        date: {
          gte: startDate,
        },
      },
      orderBy: {
        date: 'desc',
      },
    });

    const recentSleep = records.map((record) => ({
      id: record.id,
      date: record.date,
      durationMinutes: record.durationMinutes,
      quality: record.quality,
      notes: record.notes,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    }));

    if (records.length === 0) {
      return {
        days,
        recordCount: 0,
        recentSleep,
        averageDurationMinutes: null,
        averageQuality: null,
        status: SleepStatus.NO_DATA,
      };
    }

    const averageDurationMinutes = Math.round(
      records.reduce((total, record) => total + record.durationMinutes, 0) / records.length,
    );
    const averageQuality = roundTo(
      records.reduce((total, record) => total + record.quality, 0) / records.length,
    );

    return {
      days,
      recordCount: records.length,
      recentSleep,
      averageDurationMinutes,
      averageQuality,
      status: this.getSleepStatus(averageDurationMinutes, averageQuality),
    };
  }

  private getSleepStatus(averageDurationMinutes: number, averageQuality: number): SleepStatus {
    const hasShortDuration = averageDurationMinutes < GOOD_SLEEP_DURATION_MINUTES;
    const hasLowQuality = averageQuality < GOOD_SLEEP_QUALITY;

    if (hasShortDuration && hasLowQuality) {
      return SleepStatus.SHORT_DURATION_AND_LOW_QUALITY;
    }

    if (hasShortDuration) {
      return SleepStatus.SHORT_DURATION;
    }

    if (hasLowQuality) {
      return SleepStatus.LOW_QUALITY;
    }

    return SleepStatus.GOOD;
  }
}
