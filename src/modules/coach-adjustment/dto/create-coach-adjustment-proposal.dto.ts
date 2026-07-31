import { CoachAdjustmentRecommendationType } from '../../../generated/prisma/client';

export class CreateCoachAdjustmentProposalDto {
  cycleId: string;
  recommendationType: CoachAdjustmentRecommendationType;
  oldValue: Readonly<Record<string, unknown>>;
  newValue: Readonly<Record<string, unknown>>;
  reason: string;
}
