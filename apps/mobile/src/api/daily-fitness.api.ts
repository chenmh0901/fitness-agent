import { apiClient } from './api-client';
import type { DailyFitnessSummary } from '@/types/daily-fitness';

export function getTodayFitnessSummary(): Promise<DailyFitnessSummary> {
  return apiClient.get<DailyFitnessSummary>('/daily/today');
}
