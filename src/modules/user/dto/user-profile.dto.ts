import { FitnessGoal, TrainingExperience } from '../../../generated/prisma/client';

export class UserProfileDto {
  id: string;
  heightCm: number;
  currentWeight: number;
  goal: FitnessGoal;
  trainingExperience: TrainingExperience;
  weeklyTrainingDays: number;
  dailyCaloriesTarget: number;
  proteinTarget: number;
  createdAt: Date;
  updatedAt: Date;
}
