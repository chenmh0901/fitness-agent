import { CoachInsightDto } from './coach-insight.dto';

export enum CoachAnalysisStatus {
  NORMAL = 'normal',
  WARNING = 'warning',
  CRITICAL = 'critical',
  INSUFFICIENT_DATA = 'insufficient_data',
}

export class CoachAnalysisDto {
  status: CoachAnalysisStatus;
  insights: CoachInsightDto[];
}
