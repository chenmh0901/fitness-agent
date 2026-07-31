import { Module } from '@nestjs/common';
import { CoachAnalysisService } from './coach-analysis.service';
import { CoachInsightService } from './coach-insight.service';

@Module({
  providers: [CoachInsightService, CoachAnalysisService],
  exports: [CoachInsightService, CoachAnalysisService],
})
export class CoachInsightModule {}
