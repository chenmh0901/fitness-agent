export enum ExerciseProgressTrend {
  IMPROVING = 'improving',
  STABLE = 'stable',
  DECLINING = 'declining',
  INSUFFICIENT_DATA = 'insufficient_data',
}

export class ExercisePerformanceDto {
  id: string;
  workoutSessionId: string;
  date: Date;
  category: string;
  exerciseName: string;
  actualWeight: number | null;
  sets: number;
  reps: number;
  rpe: number | null;
  completed: boolean;
  averageRpe: number | null;
  lastWeight: number | null;
  lastSets: number;
  lastReps: number;
  lastRpe: number | null;
  progressTrend: ExerciseProgressTrend;
}
