import { CoachInsightSeverity, CoachInsightType } from '../../generated/prisma/client';
import { CoachContextDto } from '../agent/context/coach-context.dto';
import { CoachAnalysisService } from './coach-analysis.service';
import { CoachInsightService } from './coach-insight.service';
import { CoachAnalysisStatus } from './dto/coach-analysis.dto';

describe('CoachAnalysisService', () => {
  const analyzeWeightProgress = jest.fn();
  const analyzeTrainingAdherence = jest.fn();
  const analyzeRecovery = jest.fn();
  const analyzeNutrition = jest.fn();
  const service = new CoachAnalysisService({
    analyzeWeightProgress,
    analyzeTrainingAdherence,
    analyzeRecovery,
    analyzeNutrition,
  } as unknown as CoachInsightService);
  const context = {} as CoachContextDto;

  beforeEach(() => {
    analyzeWeightProgress.mockReset().mockReturnValue([]);
    analyzeTrainingAdherence.mockReset().mockReturnValue([]);
    analyzeRecovery.mockReset().mockReturnValue([]);
    analyzeNutrition.mockReset().mockReturnValue([]);
  });

  it('returns the highest insight severity as the overall status', () => {
    analyzeWeightProgress.mockReturnValue([
      {
        type: CoachInsightType.WEIGHT,
        severity: CoachInsightSeverity.NORMAL,
        content: 'on track',
        metadata: {},
      },
    ]);
    analyzeRecovery.mockReturnValue([
      {
        type: CoachInsightType.RECOVERY,
        severity: CoachInsightSeverity.WARNING,
        content: 'recovery risk',
        metadata: {},
      },
    ]);

    expect(service.analyze(context)).toEqual({
      status: CoachAnalysisStatus.WARNING,
      insights: [
        expect.objectContaining({ type: CoachInsightType.WEIGHT }),
        expect.objectContaining({ type: CoachInsightType.RECOVERY }),
      ],
    });
  });

  it('returns insufficient_data when no analyzer has enough data', () => {
    expect(service.analyze(context)).toEqual({
      status: CoachAnalysisStatus.INSUFFICIENT_DATA,
      insights: [],
    });
  });

  it('returns normal when every available insight is normal', () => {
    analyzeWeightProgress.mockReturnValue([
      {
        type: CoachInsightType.WEIGHT,
        severity: CoachInsightSeverity.NORMAL,
        content: 'on track',
        metadata: {},
      },
    ]);

    expect(service.analyze(context).status).toBe(CoachAnalysisStatus.NORMAL);
  });

  it('promotes a critical insight to critical overall status', () => {
    analyzeNutrition.mockReturnValue([
      {
        type: CoachInsightType.NUTRITION,
        severity: CoachInsightSeverity.CRITICAL,
        content: 'protein low',
        metadata: {},
      },
    ]);

    expect(service.analyze(context).status).toBe(CoachAnalysisStatus.CRITICAL);
  });
});
