import { DayOfWeek } from '../../../generated/prisma/client';

export class TrainingPlanItemInputDto {
  dayOfWeek: DayOfWeek;
  category: string;
  exerciseName: string;
  sets: number;
  reps: number;
  targetWeight: number | null;
  targetRpe: number | null;
  order: number;
}

export class TrainingPlanItemDto extends TrainingPlanItemInputDto {
  id: string;
}
