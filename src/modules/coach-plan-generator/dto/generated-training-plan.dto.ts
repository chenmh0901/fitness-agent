import { TrainingPlanVersionDto } from '../../coach-plan-version/dto/training-plan-version.dto';
import { TrainingPlanItemDto } from '../../coach-plan-version/dto/training-plan-item.dto';
import { TrainingCycleDto } from '../../workout/dto/training-cycle.dto';

export class GeneratedTrainingPlanDto {
  cycle: TrainingCycleDto;
  version: TrainingPlanVersionDto;
  workouts: TrainingPlanItemDto[];
}

export class GeneratedPlanMetadataDto {
  method: 'deterministic_template';
  templateId: string;
  templateName: string;
  currentVersion: number;
  generatedAt: Date;
}
