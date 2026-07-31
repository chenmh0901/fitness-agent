export class NutritionRecordDto {
  id: string;
  userId: string;
  date: Date;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}
