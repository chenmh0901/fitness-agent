import { Injectable } from '@nestjs/common';
import { CoachAdjustmentService } from '../../coach-adjustment/coach-adjustment.service';
import { TrainingPlanVersionService } from '../../coach-plan-version/training-plan-version.service';
import { DailyStatusService } from '../../daily-status/daily-status.service';
import { FitnessGoalService } from '../../fitness-goal/fitness-goal.service';
import { NutritionService } from '../../nutrition/nutrition.service';
import { SleepService } from '../../sleep/sleep.service';
import { UserProfileService } from '../../user/user-profile.service';
import { WeightService } from '../../weight/weight.service';
import { WorkoutService } from '../../workout/workout.service';
import { CoachContextDto } from './coach-context.dto';

const COACH_RECENT_WINDOW_DAYS = 7;
const COACH_LONG_TERM_WEIGHT_WINDOW_DAYS = 30;

@Injectable()
export class CoachContextService {
  constructor(
    private readonly userProfileService: UserProfileService,
    private readonly fitnessGoalService: FitnessGoalService,
    private readonly weightService: WeightService,
    private readonly sleepService: SleepService,
    private readonly nutritionService: NutritionService,
    private readonly dailyStatusService: DailyStatusService,
    private readonly workoutService: WorkoutService,
    private readonly coachAdjustmentService: CoachAdjustmentService,
    private readonly trainingPlanVersionService: TrainingPlanVersionService,
  ) {}

  async buildContext(): Promise<CoachContextDto> {
    const [
      userProfile,
      activeGoal,
      trainingCycle,
      todayWorkout,
      trainingAdherence,
      recent7Days,
      recent30Days,
      sleepSummary,
      nutritionSummary,
      dailyStatus,
      recentExercisePerformance,
      recentAdjustments,
      currentPlanVersion,
      planVersionHistory,
    ] = await Promise.all([
      this.userProfileService.getProfile(),
      this.fitnessGoalService.getActiveGoal(),
      this.workoutService.getCurrentTrainingCycle(),
      this.workoutService.getTodayWorkout(),
      this.workoutService.getTrainingAdherence(COACH_RECENT_WINDOW_DAYS),
      this.weightService.getWeightTrend(COACH_RECENT_WINDOW_DAYS),
      this.weightService.getWeightTrend(COACH_LONG_TERM_WEIGHT_WINDOW_DAYS),
      this.sleepService.getRecentSleep(COACH_RECENT_WINDOW_DAYS),
      this.nutritionService.getRecentNutrition(COACH_RECENT_WINDOW_DAYS),
      this.dailyStatusService.getTodayStatus(),
      this.workoutService.getRecentExercisePerformance(),
      this.coachAdjustmentService.getHistory(),
      this.trainingPlanVersionService.getActiveVersion(),
      this.trainingPlanVersionService.getVersionHistory(),
    ]);

    return {
      userProfile,
      activeGoal,
      trainingCycle,
      todayWorkout,
      trainingAdherence,
      weightTrend: {
        recent7Days,
        recent30Days,
      },
      sleepSummary,
      nutritionSummary,
      dailyStatus,
      recentExercisePerformance,
      recentAdjustments,
      currentPlanVersion,
      recentPlanChanges:
        this.trainingPlanVersionService.getRecentPlanChanges(planVersionHistory),
      generatedPlan: currentPlanVersion?.sourceTemplate
        ? {
            method: 'deterministic_template',
            templateId: currentPlanVersion.sourceTemplate.id,
            templateName: currentPlanVersion.sourceTemplate.name,
            currentVersion: currentPlanVersion.versionNumber,
            generatedAt: currentPlanVersion.createdAt,
          }
        : null,
    };
  }
}
