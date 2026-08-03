import { TrainingPlanVersionStatus } from '../../../generated/prisma/client';
import { TrainingPlanItemDto } from './training-plan-item.dto';

export class TrainingPlanVersionDto {
  id: string;
  trainingCycleId: string;
  sourceTemplateId: string | null;
  sourceTemplate: {
    id: string;
    name: string;
  } | null;
  versionNumber: number;
  status: TrainingPlanVersionStatus;
  changeReason: string;
  createdFromVersionId: string | null;
  workoutPlans: TrainingPlanItemDto[];
  createdAt: Date;
  updatedAt: Date;
}

export class TrainingPlanChangeDto {
  fromVersion: number;
  toVersion: number;
  reason: string;
  createdAt: Date;
}
