import { Injectable } from '@nestjs/common';
import { TodayWorkoutDto } from '../../workout/dto/today-workout.dto';
import { WorkoutService } from '../../workout/workout.service';
import { AgentTool } from './agent-tool.interface';

@Injectable()
export class GetTodayWorkoutTool implements AgentTool {
  readonly name = 'get_today_workout';
  readonly description = '获取当前训练周期中今天的只读训练计划；没有有效周期时返回 null。';

  constructor(private readonly workoutService: WorkoutService) {}

  execute(): Promise<TodayWorkoutDto | null> {
    return this.workoutService.getTodayWorkout();
  }
}
