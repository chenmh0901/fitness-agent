import { NutritionRecordDto } from './nutrition-record.dto';

export class NutritionSummaryDto {
  days: number;
  recordCount: number;
  recentNutrition: NutritionRecordDto[];
  averageCalories: number;
  averageProtein: number;
  averageCarbs: number;
  averageFat: number;
}
