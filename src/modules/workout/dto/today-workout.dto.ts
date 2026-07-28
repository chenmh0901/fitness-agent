import { DayOfWeek } from '../../../generated/prisma/client';
import { TrainingCycleDto } from './training-cycle.dto';

export class WorkoutPlanItemDto {
  id: string;
  category: string;
  exerciseName: string;
  sets: number;
  reps: number;
  targetWeight: number | null;
  targetRpe: number | null;
  order: number;
}

export class TodayWorkoutDto {
  date: Date;
  dayOfWeek: DayOfWeek;
  trainingCycle: TrainingCycleDto;
  exercises: WorkoutPlanItemDto[];
}
