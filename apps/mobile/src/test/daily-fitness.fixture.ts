import type { DailyFitnessSummary } from '@/types/daily-fitness';

export function createDailyFitnessSummary(): DailyFitnessSummary {
  return {
    localDate: '2026-07-30',
    generatedAt: '2026-07-30T02:30:00.000Z',
    weightSummary: {
      days: 7,
      recordCount: 7,
      averageWeight: 90.8,
      firstWeight: 91.2,
      latestWeight: 90.5,
      minWeight: 90.4,
      maxWeight: 91.3,
      weightRange: 0.9,
      volatility: 0.3,
      weeklyAverageChange: -0.82,
      change: -0.7,
      trend: 'decreasing',
    },
    sleepSummary: {
      days: 7,
      recordCount: 6,
      recentSleep: [
        {
          id: 'sleep-1',
          date: '2026-07-29T16:00:00.000Z',
          durationMinutes: 390,
          quality: 3,
          notes: null,
          createdAt: '2026-07-30T00:00:00.000Z',
          updatedAt: '2026-07-30T00:00:00.000Z',
        },
      ],
      averageDurationMinutes: 420,
      averageQuality: 3.4,
      status: 'short_duration',
    },
    todayWorkout: {
      date: '2026-07-29T16:00:00.000Z',
      dayOfWeek: 'THURSDAY',
      trainingCycle: {
        id: 'cycle-1',
        name: '减脂周期1',
        goal: 'FAT_LOSS',
        startDate: '2026-07-01T00:00:00.000Z',
        endDate: '2026-08-31T00:00:00.000Z',
        status: 'ACTIVE',
        createdAt: '2026-06-25T00:00:00.000Z',
        updatedAt: '2026-06-25T00:00:00.000Z',
      },
      exercises: [
        {
          id: 'plan-1',
          category: 'chest',
          exerciseName: 'barbell bench press',
          sets: 4,
          reps: 8,
          targetWeight: 80,
          targetRpe: 8,
          order: 1,
        },
      ],
    },
    recommendationsContext: {
      userProfile: {
        id: 'profile-1',
        heightCm: 180,
        currentWeight: 90.5,
        goal: 'FAT_LOSS',
        trainingExperience: 'INTERMEDIATE',
        weeklyTrainingDays: 4,
        dailyCaloriesTarget: 2200,
        proteinTarget: 180,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-07-30T00:00:00.000Z',
      },
      recentExercisePerformance: [],
    },
  };
}
