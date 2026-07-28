import { Injectable } from '@nestjs/common';
import { SleepService } from '../../sleep/sleep.service';
import { UserProfileService } from '../../user/user-profile.service';
import { WeightService } from '../../weight/weight.service';
import { WorkoutService } from '../../workout/workout.service';
import { AgentContextDto } from './agent-context.dto';

@Injectable()
export class AgentContextService {
  constructor(
    private readonly userProfileService: UserProfileService,
    private readonly weightService: WeightService,
    private readonly sleepService: SleepService,
    private readonly workoutService: WorkoutService,
  ) {}

  async buildContext(): Promise<AgentContextDto> {
    const [
      userProfile,
      todayWorkout,
      currentTrainingCycle,
      weightTrend7Days,
      weightTrend30Days,
      sleepSummary7Days,
      recentExercisePerformance,
    ] = await Promise.all([
      this.userProfileService.getProfile(),
      this.workoutService.getTodayWorkout(),
      this.workoutService.getCurrentTrainingCycle(),
      this.weightService.getWeightTrend(7),
      this.weightService.getWeightTrend(30),
      this.sleepService.getRecentSleep(7),
      this.workoutService.getRecentExercisePerformance(),
    ]);

    return {
      userProfile,
      todayWorkout,
      currentTrainingCycle,
      weightTrend7Days,
      weightTrend30Days,
      sleepSummary7Days,
      recentExercisePerformance,
    };
  }
}
