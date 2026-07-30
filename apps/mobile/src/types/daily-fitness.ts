export type FitnessGoal = 'FAT_LOSS' | 'MUSCLE_GAIN' | 'MAINTENANCE';
export type TrainingExperience = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
export type WeightTrend = 'insufficient_data' | 'decreasing' | 'stable' | 'increasing';
export type SleepStatus =
  'no_data' | 'good' | 'short_duration' | 'low_quality' | 'short_duration_and_low_quality';

export interface UserProfile {
  id: string;
  heightCm: number;
  currentWeight: number;
  goal: FitnessGoal;
  trainingExperience: TrainingExperience;
  weeklyTrainingDays: number;
  dailyCaloriesTarget: number;
  proteinTarget: number;
  createdAt: string;
  updatedAt: string;
}

export interface WeightSummary {
  days: number;
  recordCount: number;
  averageWeight: number | null;
  firstWeight: number | null;
  latestWeight: number | null;
  minWeight: number | null;
  maxWeight: number | null;
  weightRange: number | null;
  volatility: number | null;
  weeklyAverageChange: number | null;
  change: number | null;
  trend: WeightTrend;
}

export interface SleepRecord {
  id: string;
  date: string;
  durationMinutes: number;
  quality: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SleepSummary {
  days: number;
  recordCount: number;
  recentSleep: SleepRecord[];
  averageDurationMinutes: number | null;
  averageQuality: number | null;
  status: SleepStatus;
}

export interface TrainingCycle {
  id: string;
  name: string;
  goal: FitnessGoal;
  startDate: string;
  endDate: string;
  status: 'PLANNED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
  updatedAt: string;
}

export interface WorkoutPlanItem {
  id: string;
  category: string;
  exerciseName: string;
  sets: number;
  reps: number;
  targetWeight: number | null;
  targetRpe: number | null;
  order: number;
}

export interface TodayWorkout {
  date: string;
  dayOfWeek: 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';
  trainingCycle: TrainingCycle;
  exercises: WorkoutPlanItem[];
}

export interface ExercisePerformance {
  id: string;
  workoutSessionId: string;
  date: string;
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
  progressTrend: 'improving' | 'stable' | 'declining' | 'insufficient_data';
}

export interface DailyFitnessSummary {
  localDate: string;
  generatedAt: string;
  weightSummary: WeightSummary;
  sleepSummary: SleepSummary;
  todayWorkout: TodayWorkout | null;
  recommendationsContext: {
    userProfile: UserProfile | null;
    recentExercisePerformance: ExercisePerformance[];
  };
}
