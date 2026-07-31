import { Injectable } from '@nestjs/common';
import { CoachInsightSeverity } from '../../generated/prisma/client';
import { CoachContextDto } from '../agent/context/coach-context.dto';
import { CoachInsightService } from './coach-insight.service';
import { CoachAnalysisDto, CoachAnalysisStatus } from './dto/coach-analysis.dto';

@Injectable()
export class CoachAnalysisService {
  constructor(private readonly coachInsightService: CoachInsightService) {}

  analyze(context: CoachContextDto): CoachAnalysisDto {
    const insights = [
      ...this.coachInsightService.analyzeWeightProgress(context),
      ...this.coachInsightService.analyzeTrainingAdherence(context),
      ...this.coachInsightService.analyzeRecovery(context),
      ...this.coachInsightService.analyzeNutrition(context),
    ];

    return {
      status: this.getStatus(insights.map(({ severity }) => severity)),
      insights,
    };
  }

  private getStatus(severities: CoachInsightSeverity[]): CoachAnalysisStatus {
    if (severities.length === 0) {
      return CoachAnalysisStatus.INSUFFICIENT_DATA;
    }

    if (severities.includes(CoachInsightSeverity.CRITICAL)) {
      return CoachAnalysisStatus.CRITICAL;
    }

    if (severities.includes(CoachInsightSeverity.WARNING)) {
      return CoachAnalysisStatus.WARNING;
    }

    return CoachAnalysisStatus.NORMAL;
  }
}
