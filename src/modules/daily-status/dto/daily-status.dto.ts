export class DailyStatusDto {
  id: string;
  userId: string;
  date: Date;
  energyLevel: number;
  fatigueLevel: number;
  muscleSoreness: number;
  stressLevel: number;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}
