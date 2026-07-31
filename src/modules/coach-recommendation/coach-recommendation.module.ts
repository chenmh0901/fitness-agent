import { Module } from '@nestjs/common';
import { CoachRecommendationService } from './coach-recommendation.service';

@Module({
  providers: [CoachRecommendationService],
  exports: [CoachRecommendationService],
})
export class CoachRecommendationModule {}
