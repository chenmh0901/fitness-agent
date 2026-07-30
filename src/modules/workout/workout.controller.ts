import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { CreateWorkoutFeedbackDto } from './dto/create-workout-feedback.dto';
import { CreateWorkoutRecordDto } from './dto/create-workout-record.dto';
import { ExercisePerformanceDto } from './dto/exercise-performance.dto';
import { WorkoutService } from './workout.service';

@Controller('workout')
export class WorkoutController {
  constructor(private readonly workoutService: WorkoutService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  recordWorkout(@Body() request: CreateWorkoutRecordDto): Promise<ExercisePerformanceDto> {
    return this.workoutService.recordWorkout(request);
  }

  @Post('feedback')
  @HttpCode(HttpStatus.CREATED)
  recordWorkoutFeedback(
    @Body() request: CreateWorkoutFeedbackDto,
  ): Promise<ExercisePerformanceDto> {
    return this.workoutService.recordWorkoutFeedback(request);
  }
}
