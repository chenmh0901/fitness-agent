import { Transform } from 'class-transformer';
import { IsDate, IsInt, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { transformLocalDate } from '../../../common/transforms/local-date.transform';

export class CreateNutritionRecordDto {
  @IsInt()
  @Min(0)
  calories: number;

  @IsNumber({ allowInfinity: false, allowNaN: false, maxDecimalPlaces: 2 })
  @Min(0)
  protein: number;

  @IsNumber({ allowInfinity: false, allowNaN: false, maxDecimalPlaces: 2 })
  @Min(0)
  carbs: number;

  @IsNumber({ allowInfinity: false, allowNaN: false, maxDecimalPlaces: 2 })
  @Min(0)
  fat: number;

  @Transform(transformLocalDate)
  @IsDate({ message: 'date must be a valid date in YYYY-MM-DD format' })
  date: Date;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
