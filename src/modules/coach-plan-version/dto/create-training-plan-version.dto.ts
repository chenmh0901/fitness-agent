import { TrainingPlanItemInputDto } from './training-plan-item.dto';

export class CreateInitialTrainingPlanVersionDto {
  trainingCycleId: string;
  sourceTemplateId?: string;
  workoutPlan: TrainingPlanItemInputDto[];
  reason?: string;
}

export class CreateNewTrainingPlanVersionDto {
  currentVersionId: string;
  expectedTrainingCycleId?: string;
  newWorkoutPlan: TrainingPlanItemInputDto[];
  reason: string;
}
