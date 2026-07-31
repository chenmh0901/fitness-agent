import { CoachAdjustmentDto } from '../../coach-adjustment/dto/coach-adjustment.dto';
import {
  TrainingPlanChangeDto,
  TrainingPlanVersionDto,
} from '../../coach-plan-version/dto/training-plan-version.dto';
import { DailyStatusDto } from '../../daily-status/dto/daily-status.dto';
import { FitnessGoalDto } from '../../fitness-goal/dto/fitness-goal.dto';
import { NutritionSummaryDto } from '../../nutrition/dto/nutrition-summary.dto';
import { SleepSummaryDto } from '../../sleep/dto/sleep-summary.dto';
import { UserProfileDto } from '../../user/dto/user-profile.dto';
import { WeightTrendDto } from '../../weight/dto/weight-trend.dto';
import { ExercisePerformanceDto } from '../../workout/dto/exercise-performance.dto';
import { TodayWorkoutDto } from '../../workout/dto/today-workout.dto';
import { TrainingAdherenceDto } from '../../workout/dto/training-adherence.dto';
import { TrainingCycleDto } from '../../workout/dto/training-cycle.dto';

export class CoachWeightTrendDto {
  recent7Days: WeightTrendDto;
  recent30Days: WeightTrendDto;
}

export class CoachContextDto {
  userProfile: UserProfileDto | null;
  activeGoal: FitnessGoalDto | null;
  trainingCycle: TrainingCycleDto | null;
  todayWorkout: TodayWorkoutDto | null;
  trainingAdherence: TrainingAdherenceDto;
  weightTrend: CoachWeightTrendDto;
  sleepSummary: SleepSummaryDto;
  nutritionSummary: NutritionSummaryDto | null;
  dailyStatus: DailyStatusDto | null;
  recentExercisePerformance: ExercisePerformanceDto[];
  recentAdjustments: CoachAdjustmentDto[];
  currentPlanVersion: TrainingPlanVersionDto | null;
  recentPlanChanges: TrainingPlanChangeDto[];
}
