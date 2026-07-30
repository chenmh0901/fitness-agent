import { Transform } from 'class-transformer';
import { IsDate, IsInt, Max, Min } from 'class-validator';
import { transformLocalDate } from '../../../common/transforms/local-date.transform';

export class CreateSleepRecordDto {
  @IsInt()
  @Min(1)
  durationMinutes: number;

  @IsInt()
  @Min(1)
  @Max(5)
  quality: number;

  @Transform(transformLocalDate)
  @IsDate({ message: 'date must be a valid date in YYYY-MM-DD format' })
  date: Date;
}
