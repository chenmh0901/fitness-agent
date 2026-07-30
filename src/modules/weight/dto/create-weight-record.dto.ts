import { Transform } from 'class-transformer';
import { IsDate, IsEnum, IsNumber, IsPositive } from 'class-validator';
import { WeightRecordType } from '../../../generated/prisma/client';
import { transformLocalDate } from '../../../common/transforms/local-date.transform';

export class CreateWeightRecordDto {
  @IsNumber({ allowInfinity: false, allowNaN: false, maxDecimalPlaces: 2 })
  @IsPositive()
  weight: number;

  @Transform(({ value }: { value: unknown }) => {
    if (value === 'morning') {
      return WeightRecordType.MORNING;
    }

    if (value === 'evening') {
      return WeightRecordType.EVENING;
    }

    return value;
  })
  @IsEnum(WeightRecordType)
  recordType: WeightRecordType;

  @Transform(transformLocalDate)
  @IsDate({ message: 'date must be a valid date in YYYY-MM-DD format' })
  date: Date;
}
