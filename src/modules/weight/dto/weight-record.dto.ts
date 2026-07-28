import { WeightRecordType } from '../../../generated/prisma/client';

export class WeightRecordDto {
  id: string;
  weight: number;
  recordType: WeightRecordType;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
}
