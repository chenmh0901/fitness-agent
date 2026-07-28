import { Module } from '@nestjs/common';
import { WorkoutService } from './workout.service';

@Module({
  providers: [WorkoutService],
  exports: [WorkoutService],
})
export class WorkoutModule {}
