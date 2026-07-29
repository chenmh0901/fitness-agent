import { SleepSummaryDto } from '../../sleep/dto/sleep-summary.dto';
import { UserProfileDto } from '../../user/dto/user-profile.dto';
import { WeightTrendDto } from '../../weight/dto/weight-trend.dto';
import { ExercisePerformanceDto } from '../../workout/dto/exercise-performance.dto';
import { TodayWorkoutDto } from '../../workout/dto/today-workout.dto';

export class DailyFitnessRecommendationsContextDto {
  userProfile: UserProfileDto | null;
  recentExercisePerformance: ExercisePerformanceDto[];
}

export class DailyFitnessSummaryDto {
  date: Date;
  weightSummary: WeightTrendDto;
  sleepSummary: SleepSummaryDto;
  todayWorkout: TodayWorkoutDto | null;
  recommendationsContext: DailyFitnessRecommendationsContextDto;
}
