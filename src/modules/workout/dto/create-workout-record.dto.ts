import { Transform } from 'class-transformer';
import { IsDate, IsInt, IsNotEmpty, IsNumber, IsString, MaxLength, Min } from 'class-validator';
import { transformLocalDate } from '../../../common/transforms/local-date.transform';

export class CreateWorkoutRecordDto {
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  exerciseName: string;

  @IsNumber({ allowInfinity: false, allowNaN: false, maxDecimalPlaces: 2 })
  @Min(0)
  weight: number;

  @IsInt()
  @Min(1)
  sets: number;

  @IsInt()
  @Min(1)
  reps: number;

  @Transform(transformLocalDate)
  @IsDate({ message: 'date must be a valid date in YYYY-MM-DD format' })
  date: Date;
}
