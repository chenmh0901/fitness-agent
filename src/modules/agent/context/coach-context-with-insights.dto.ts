import { CoachAnalysisStatus } from '../../coach-insight/dto/coach-analysis.dto';
import { CoachInsightDto } from '../../coach-insight/dto/coach-insight.dto';
import { CoachRecommendationDto } from '../../coach-recommendation/dto/coach-recommendation.dto';
import { CoachContextDto } from './coach-context.dto';

export class CoachContextWithInsightsDto {
  coachContext: CoachContextDto;
  status: CoachAnalysisStatus;
  insights: CoachInsightDto[];
  recommendations: CoachRecommendationDto[];
}
