import { Controller, Get } from '@nestjs/common';
import { TrainingPlanVersionDto } from './dto/training-plan-version.dto';
import { TrainingPlanVersionService } from './training-plan-version.service';

@Controller('training-plan')
export class TrainingPlanVersionController {
  constructor(private readonly trainingPlanVersionService: TrainingPlanVersionService) {}

  @Get('current')
  getCurrentPlan(): Promise<TrainingPlanVersionDto | null> {
    return this.trainingPlanVersionService.getActiveVersion();
  }

  @Get('history')
  getPlanHistory(): Promise<TrainingPlanVersionDto[]> {
    return this.trainingPlanVersionService.getVersionHistory();
  }
}
