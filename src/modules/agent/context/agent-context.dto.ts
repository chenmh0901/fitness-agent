import { SleepSummaryDto } from '../../sleep/dto/sleep-summary.dto';
import { UserProfileDto } from '../../user/dto/user-profile.dto';
import { WeightTrendDto } from '../../weight/dto/weight-trend.dto';
import { ExercisePerformanceDto } from '../../workout/dto/exercise-performance.dto';
import { TodayWorkoutDto } from '../../workout/dto/today-workout.dto';
import { TrainingCycleDto } from '../../workout/dto/training-cycle.dto';

export class AgentContextDto {
  userProfile: UserProfileDto | null;
  todayWorkout: TodayWorkoutDto | null;
  currentTrainingCycle: TrainingCycleDto | null;
  weightTrend7Days: WeightTrendDto;
  weightTrend30Days: WeightTrendDto;
  sleepSummary7Days: SleepSummaryDto;
  recentExercisePerformance: ExercisePerformanceDto[];
}
