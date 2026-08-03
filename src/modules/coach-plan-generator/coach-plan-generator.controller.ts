import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { CoachPlanGeneratorService } from './coach-plan-generator.service';
import { GenerateTrainingPlanDto } from './dto/generate-training-plan.dto';
import { GeneratedTrainingPlanDto } from './dto/generated-training-plan.dto';

@Controller('training-plan')
export class CoachPlanGeneratorController {
  constructor(private readonly coachPlanGeneratorService: CoachPlanGeneratorService) {}

  @Post('generate')
  @HttpCode(HttpStatus.CREATED)
  generatePlan(
    @Body() request: GenerateTrainingPlanDto,
  ): Promise<GeneratedTrainingPlanDto> {
    return this.coachPlanGeneratorService.generatePlan(request);
  }
}
