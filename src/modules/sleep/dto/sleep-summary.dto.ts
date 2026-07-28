import { SleepRecordDto } from './sleep-record.dto';

export enum SleepStatus {
  NO_DATA = 'no_data',
  GOOD = 'good',
  SHORT_DURATION = 'short_duration',
  LOW_QUALITY = 'low_quality',
  SHORT_DURATION_AND_LOW_QUALITY = 'short_duration_and_low_quality',
}

export class SleepSummaryDto {
  days: number;
  recordCount: number;
  recentSleep: SleepRecordDto[];
  averageDurationMinutes: number | null;
  averageQuality: number | null;
  status: SleepStatus;
}
