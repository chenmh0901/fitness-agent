import { Injectable } from '@nestjs/common';
import { startOfLocalDay } from '../../../common/utils/date.util';
import { SleepService } from '../../sleep/sleep.service';
import { UserProfileService } from '../../user/user-profile.service';
import { WeightService } from '../../weight/weight.service';
import { WorkoutService } from '../../workout/workout.service';
import { DailyFitnessSummaryDto } from './daily-fitness-summary.dto';

@Injectable()
export class DailyFitnessService {
  constructor(
    private readonly userProfileService: UserProfileService,
    private readonly weightService: WeightService,
    private readonly sleepService: SleepService,
    private readonly workoutService: WorkoutService,
  ) {}

  async getDailySummary(currentDate: Date): Promise<DailyFitnessSummaryDto> {
    if (!(currentDate instanceof Date) || Number.isNaN(currentDate.getTime())) {
      throw new TypeError('currentDate must be a valid Date');
    }

    const [userProfile, todayWorkout, weightSummary, sleepSummary, recentExercisePerformance] =
      await Promise.all([
        this.userProfileService.getProfile(),
        this.workoutService.getTodayWorkout(),
        this.weightService.getWeightTrend(7),
        this.sleepService.getRecentSleep(7),
        this.workoutService.getRecentExercisePerformance(),
      ]);

    return {
      date: startOfLocalDay(currentDate),
      weightSummary,
      sleepSummary,
      todayWorkout,
      recommendationsContext: {
        userProfile,
        recentExercisePerformance,
      },
    };
  }
}
