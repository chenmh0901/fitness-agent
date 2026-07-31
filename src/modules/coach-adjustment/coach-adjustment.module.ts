import { Module } from '@nestjs/common';
import { CoachPlanVersionModule } from '../coach-plan-version/coach-plan-version.module';
import { CoachAdjustmentService } from './coach-adjustment.service';

@Module({
  imports: [CoachPlanVersionModule],
  providers: [CoachAdjustmentService],
  exports: [CoachAdjustmentService, CoachPlanVersionModule],
})
export class CoachAdjustmentModule {}
