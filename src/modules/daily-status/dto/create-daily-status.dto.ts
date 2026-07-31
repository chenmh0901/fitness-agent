import { Transform } from 'class-transformer';
import { IsDate, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { transformLocalDate } from '../../../common/transforms/local-date.transform';

export class CreateDailyStatusDto {
  @IsInt()
  @Min(1)
  @Max(10)
  energyLevel: number;

  @IsInt()
  @Min(1)
  @Max(10)
  fatigueLevel: number;

  @IsInt()
  @Min(1)
  @Max(10)
  muscleSoreness: number;

  @IsInt()
  @Min(1)
  @Max(10)
  stressLevel: number;

  @Transform(transformLocalDate)
  @IsDate({ message: 'date must be a valid date in YYYY-MM-DD format' })
  date: Date;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
