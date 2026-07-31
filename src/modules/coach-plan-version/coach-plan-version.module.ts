import { Module } from '@nestjs/common';
import { TrainingPlanVersionController } from './training-plan-version.controller';
import { TrainingPlanVersionService } from './training-plan-version.service';

@Module({
  controllers: [TrainingPlanVersionController],
  providers: [TrainingPlanVersionService],
  exports: [TrainingPlanVersionService],
})
export class CoachPlanVersionModule {}
