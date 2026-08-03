import { Module } from '@nestjs/common';
import { CoachPlanVersionModule } from '../coach-plan-version/coach-plan-version.module';
import { CoachPlanGeneratorController } from './coach-plan-generator.controller';
import { CoachPlanGeneratorService } from './coach-plan-generator.service';

@Module({
  imports: [CoachPlanVersionModule],
  controllers: [CoachPlanGeneratorController],
  providers: [CoachPlanGeneratorService],
  exports: [CoachPlanGeneratorService],
})
export class CoachPlanGeneratorModule {}
