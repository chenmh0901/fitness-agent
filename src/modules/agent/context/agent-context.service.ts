import { Injectable } from '@nestjs/common';
import { CoachAnalysisService } from '../../coach-insight/coach-analysis.service';
import { CoachRecommendationService } from '../../coach-recommendation/coach-recommendation.service';
import { CoachContextWithInsightsDto } from './coach-context-with-insights.dto';
import { CoachContextService } from './coach-context.service';

@Injectable()
export class AgentContextService {
  constructor(
    private readonly coachContextService: CoachContextService,
    private readonly coachAnalysisService: CoachAnalysisService,
    private readonly coachRecommendationService: CoachRecommendationService,
  ) {}

  async buildContext(): Promise<CoachContextWithInsightsDto> {
    const coachContext = await this.coachContextService.buildContext();
    const { status, insights } = this.coachAnalysisService.analyze(coachContext);
    const contextWithInsights = {
      coachContext,
      status,
      insights,
    };
    const recommendations =
      this.coachRecommendationService.generateRecommendations(contextWithInsights);

    return {
      ...contextWithInsights,
      recommendations,
    };
  }
}
