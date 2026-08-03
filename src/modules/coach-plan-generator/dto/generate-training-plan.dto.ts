import { IsEnum, IsInt, Max, Min } from 'class-validator';
import {
  ProfileFitnessGoal,
  TrainingExperience,
} from '../../../generated/prisma/client';

export class GenerateTrainingPlanDto {
  @IsEnum(ProfileFitnessGoal)
  goal: ProfileFitnessGoal;

  @IsEnum(TrainingExperience)
  experience: TrainingExperience;

  @IsInt()
  @Min(1)
  @Max(7)
  daysPerWeek: number;
}
