import { WeightRecordType } from '../../../generated/prisma/client';

export class CreateWeightRecordDto {
  weight: number;
  recordType: WeightRecordType;
  date: Date;
}
