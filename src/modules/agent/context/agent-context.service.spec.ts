import { CoachAnalysisService } from '../../coach-insight/coach-analysis.service';
import { CoachAnalysisStatus } from '../../coach-insight/dto/coach-analysis.dto';
import { CoachRecommendationService } from '../../coach-recommendation/coach-recommendation.service';
import { CoachContextDto } from './coach-context.dto';
import { CoachContextService } from './coach-context.service';
import { AgentContextService } from './agent-context.service';

describe('AgentContextService', () => {
  const buildCoachContext = jest.fn();
  const analyze = jest.fn();
  const generateRecommendations = jest.fn();
  const service = new AgentContextService(
    {
      buildContext: buildCoachContext,
    } as unknown as CoachContextService,
    {
      analyze,
    } as unknown as CoachAnalysisService,
    {
      generateRecommendations,
    } as unknown as CoachRecommendationService,
  );

  beforeEach(() => {
    buildCoachContext.mockReset();
    analyze.mockReset();
    generateRecommendations.mockReset();
  });

  it('preserves the legacy entry point while returning Coach Context with insights', async () => {
    const context = {
      userProfile: null,
      activeGoal: null,
      trainingCycle: null,
      todayWorkout: null,
      trainingAdherence: {
        days: 7,
        plannedSessions: 0,
        completedSessions: 0,
        adherenceRate: null,
      },
      weightTrend: {},
      sleepSummary: {},
      nutritionSummary: null,
      dailyStatus: null,
      recentExercisePerformance: [],
      recentAdjustments: [],
      currentPlanVersion: null,
      recentPlanChanges: [],
    } as unknown as CoachContextDto;
    const insights = [
      {
        type: 'weight',
        severity: 'normal',
        content: 'on track',
        metadata: {},
      },
    ];
    buildCoachContext.mockResolvedValue(context);
    analyze.mockReturnValue({
      status: CoachAnalysisStatus.NORMAL,
      insights,
    });
    const recommendations = [
      {
        type: 'GOAL',
        action: 'keep tracking',
        reason: 'weight trend',
      },
    ];
    generateRecommendations.mockReturnValue(recommendations);

    await expect(service.buildContext()).resolves.toEqual({
      coachContext: context,
      status: CoachAnalysisStatus.NORMAL,
      insights,
      recommendations,
    });
    expect(buildCoachContext).toHaveBeenCalledTimes(1);
    expect(analyze).toHaveBeenCalledWith(context);
    expect(generateRecommendations).toHaveBeenCalledWith({
      coachContext: context,
      status: CoachAnalysisStatus.NORMAL,
      insights,
    });
  });

  it('propagates Coach Context source failures', async () => {
    const error = new Error('context source failed');
    buildCoachContext.mockRejectedValue(error);

    await expect(service.buildContext()).rejects.toBe(error);
    expect(analyze).not.toHaveBeenCalled();
    expect(generateRecommendations).not.toHaveBeenCalled();
  });
});
