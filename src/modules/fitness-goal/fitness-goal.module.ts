import { Module } from '@nestjs/common';
import { FitnessGoalController } from './fitness-goal.controller';
import { FitnessGoalService } from './fitness-goal.service';

@Module({
  controllers: [FitnessGoalController],
  providers: [FitnessGoalService],
  exports: [FitnessGoalService],
})
export class FitnessGoalModule {}
