import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { CreateFitnessGoalDto } from './dto/create-fitness-goal.dto';
import { FitnessGoalDto } from './dto/fitness-goal.dto';
import { FitnessGoalService } from './fitness-goal.service';

@Controller('goals')
export class FitnessGoalController {
  constructor(private readonly fitnessGoalService: FitnessGoalService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  createGoal(@Body() request: CreateFitnessGoalDto): Promise<FitnessGoalDto> {
    return this.fitnessGoalService.createGoal(request);
  }

  @Get('active')
  getActiveGoal(): Promise<FitnessGoalDto | null> {
    return this.fitnessGoalService.getActiveGoal();
  }
}
