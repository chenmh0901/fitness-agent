export class SleepRecordDto {
  id: string;
  date: Date;
  durationMinutes: number;
  quality: number;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}
