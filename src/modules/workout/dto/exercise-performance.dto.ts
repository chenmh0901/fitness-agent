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
}
