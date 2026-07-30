import { IsBoolean, IsNumber, Max, Min } from 'class-validator';
import { CreateWorkoutRecordDto } from './create-workout-record.dto';

export class CreateWorkoutFeedbackDto extends CreateWorkoutRecordDto {
  @IsNumber({ allowInfinity: false, allowNaN: false, maxDecimalPlaces: 1 })
  @Min(1)
  @Max(10)
  rpe: number;

  @IsBoolean()
  completed: boolean;
}
