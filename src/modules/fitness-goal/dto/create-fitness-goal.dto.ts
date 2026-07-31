import { Transform } from 'class-transformer';
import { IsDate, IsEnum, IsInt, IsNumber, IsOptional, Max, Min } from 'class-validator';
import { FitnessGoalPriority, FitnessGoalType } from '../../../generated/prisma/client';
import { transformLocalDate } from '../../../common/transforms/local-date.transform';

export class CreateFitnessGoalDto {
  @IsEnum(FitnessGoalType)
  type: FitnessGoalType;

  @IsNumber({ allowInfinity: false, allowNaN: false, maxDecimalPlaces: 2 })
  @Min(1)
  startWeight: number;

  @IsNumber({ allowInfinity: false, allowNaN: false, maxDecimalPlaces: 2 })
  @Min(1)
  targetWeight: number;

  @IsOptional()
  @IsNumber({ allowInfinity: false, allowNaN: false, maxDecimalPlaces: 1 })
  @Min(0)
  @Max(100)
  targetBodyFat?: number;

  @Transform(transformLocalDate)
  @IsDate({ message: 'startDate must be a valid date in YYYY-MM-DD format' })
  startDate: Date;

  @Transform(transformLocalDate)
  @IsDate({ message: 'targetDate must be a valid date in YYYY-MM-DD format' })
  targetDate: Date;

  @IsInt()
  @Min(1)
  durationWeeks: number;

  @IsEnum(FitnessGoalPriority)
  priority: FitnessGoalPriority;
}
