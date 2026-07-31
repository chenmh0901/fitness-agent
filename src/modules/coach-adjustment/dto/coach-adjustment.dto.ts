import {
  CoachAdjustmentRecommendationType,
  CoachAdjustmentStatus,
} from '../../../generated/prisma/client';

export class CoachAdjustmentDto {
  id: string;
  userId: string;
  cycleId: string;
  recommendationType: CoachAdjustmentRecommendationType;
  oldValue: unknown;
  newValue: unknown;
  reason: string;
  status: CoachAdjustmentStatus;
  createdAt: Date;
  updatedAt: Date;
}
