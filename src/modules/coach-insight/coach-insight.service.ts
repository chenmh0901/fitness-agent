import { Injectable } from '@nestjs/common';
import {
  CoachInsightSeverity,
  CoachInsightType,
} from '../../generated/prisma/client';
import { CoachContextDto } from '../agent/context/coach-context.dto';
import { SleepStatus } from '../sleep/dto/sleep-summary.dto';
import { roundTo } from '../../common/utils/number.util';
import { CoachInsightDto } from './dto/coach-insight.dto';

const ON_TRACK_RATE_RATIO = 0.75;
const CRITICAL_WRONG_DIRECTION_KG = 0.5;
const LOW_TRAINING_ADHERENCE_PERCENT = 80;
const CRITICAL_TRAINING_ADHERENCE_PERCENT = 50;
const WARNING_SLEEP_DURATION_MINUTES = 7 * 60;
const CRITICAL_SLEEP_DURATION_MINUTES = 6 * 60;
const WARNING_SLEEP_QUALITY = 3;
const WARNING_FATIGUE_LEVEL = 6;
const CRITICAL_FATIGUE_LEVEL = 8;
const WARNING_SORENESS_LEVEL = 7;
const CRITICAL_SORENESS_LEVEL = 9;
const WARNING_STRESS_LEVEL = 7;
const WARNING_PROTEIN_RATIO = 0.9;
const CRITICAL_PROTEIN_RATIO = 0.75;
const WARNING_CALORIE_DEVIATION_RATIO = 0.15;
const CRITICAL_CALORIE_DEVIATION_RATIO = 0.25;

@Injectable()
export class CoachInsightService {
  analyzeWeightProgress(context: CoachContextDto): CoachInsightDto[] {
    const goal = context.activeGoal;
    const actualWeeklyChange = context.weightTrend.recent7Days.weeklyAverageChange;

    if (!goal || actualWeeklyChange === null) {
      return [];
    }

    const targetWeeklyChange = roundTo(
      (goal.targetWeight - goal.startWeight) / goal.durationWeeks,
    );
    const rateAchievementPercent =
      targetWeeklyChange === 0
        ? null
        : roundTo((actualWeeklyChange / targetWeeklyChange) * 100);
    const isTargetDirection =
      targetWeeklyChange === 0 || Math.sign(actualWeeklyChange) === Math.sign(targetWeeklyChange);
    const isOnTrack =
      targetWeeklyChange === 0
        ? Math.abs(actualWeeklyChange) <= 0.1
        : isTargetDirection &&
          Math.abs(actualWeeklyChange) >= Math.abs(targetWeeklyChange) * ON_TRACK_RATE_RATIO;
    const isCritical =
      !isTargetDirection && Math.abs(actualWeeklyChange) >= CRITICAL_WRONG_DIRECTION_KG;
    const severity = isOnTrack
      ? CoachInsightSeverity.NORMAL
      : isCritical
        ? CoachInsightSeverity.CRITICAL
        : CoachInsightSeverity.WARNING;
    const stateDescription = isOnTrack
      ? '当前体重变化速度基本符合目标。'
      : isCritical
        ? '当前体重变化方向与目标明显相反。'
        : '当前体重变化速度落后于目标。';

    return [
      {
        type: CoachInsightType.WEIGHT,
        severity,
        content: `近7天实际每周体重变化为 ${actualWeeklyChange}kg，目标速度为 ${targetWeeklyChange}kg/周。${stateDescription}`,
        metadata: {
          goalType: goal.type,
          targetWeeklyChangeKg: targetWeeklyChange,
          actualWeeklyChangeKg: actualWeeklyChange,
          rateAchievementPercent,
          recordCount: context.weightTrend.recent7Days.recordCount,
        },
      },
    ];
  }

  analyzeTrainingAdherence(context: CoachContextDto): CoachInsightDto[] {
    const { trainingAdherence } = context;

    if (trainingAdherence.adherenceRate === null) {
      return [];
    }

    const severity =
      trainingAdherence.adherenceRate < CRITICAL_TRAINING_ADHERENCE_PERCENT
        ? CoachInsightSeverity.CRITICAL
        : trainingAdherence.adherenceRate < LOW_TRAINING_ADHERENCE_PERCENT
          ? CoachInsightSeverity.WARNING
          : CoachInsightSeverity.NORMAL;
    const stateDescription =
      severity === CoachInsightSeverity.NORMAL
        ? '训练执行率处于正常范围。'
        : severity === CoachInsightSeverity.WARNING
          ? '训练执行率偏低。'
          : '训练执行率严重偏低。';

    return [
      {
        type: CoachInsightType.TRAINING,
        severity,
        content: `最近${trainingAdherence.days}天计划训练 ${trainingAdherence.plannedSessions} 次，完成 ${trainingAdherence.completedSessions} 次，执行率 ${trainingAdherence.adherenceRate}%。${stateDescription}`,
        metadata: {
          days: trainingAdherence.days,
          plannedSessions: trainingAdherence.plannedSessions,
          completedSessions: trainingAdherence.completedSessions,
          adherenceRate: trainingAdherence.adherenceRate,
        },
      },
    ];
  }

  analyzeRecovery(context: CoachContextDto): CoachInsightDto[] {
    const sleep = context.sleepSummary;
    const status = context.dailyStatus;

    if (sleep.recordCount === 0 && !status) {
      return [];
    }

    const hasCriticalSignal =
      (sleep.averageDurationMinutes !== null &&
        sleep.averageDurationMinutes < CRITICAL_SLEEP_DURATION_MINUTES) ||
      (status?.fatigueLevel ?? 0) >= CRITICAL_FATIGUE_LEVEL ||
      (status?.muscleSoreness ?? 0) >= CRITICAL_SORENESS_LEVEL;
    const hasWarningSignal =
      sleep.status === SleepStatus.SHORT_DURATION ||
      sleep.status === SleepStatus.LOW_QUALITY ||
      sleep.status === SleepStatus.SHORT_DURATION_AND_LOW_QUALITY ||
      (sleep.averageDurationMinutes !== null &&
        sleep.averageDurationMinutes < WARNING_SLEEP_DURATION_MINUTES) ||
      (sleep.averageQuality !== null && sleep.averageQuality < WARNING_SLEEP_QUALITY) ||
      (status?.fatigueLevel ?? 0) >= WARNING_FATIGUE_LEVEL ||
      (status?.muscleSoreness ?? 0) >= WARNING_SORENESS_LEVEL ||
      (status?.stressLevel ?? 0) >= WARNING_STRESS_LEVEL;
    const severity = hasCriticalSignal
      ? CoachInsightSeverity.CRITICAL
      : hasWarningSignal
        ? CoachInsightSeverity.WARNING
        : CoachInsightSeverity.NORMAL;
    const stateDescription =
      severity === CoachInsightSeverity.NORMAL
        ? '当前恢复指标处于正常范围。'
        : severity === CoachInsightSeverity.WARNING
          ? '当前存在恢复不足信号。'
          : '当前恢复风险较高。';

    return [
      {
        type: CoachInsightType.RECOVERY,
        severity,
        content: `近7天平均睡眠 ${this.formatSleepDuration(sleep.averageDurationMinutes)}，平均质量 ${sleep.averageQuality ?? '无数据'}；今日疲劳 ${status?.fatigueLevel ?? '无数据'}/10，肌肉酸痛 ${status?.muscleSoreness ?? '无数据'}/10，压力 ${status?.stressLevel ?? '无数据'}/10。${stateDescription}`,
        metadata: {
          averageSleepMinutes: sleep.averageDurationMinutes,
          averageSleepQuality: sleep.averageQuality,
          sleepStatus: sleep.status,
          fatigueLevel: status?.fatigueLevel ?? null,
          muscleSoreness: status?.muscleSoreness ?? null,
          stressLevel: status?.stressLevel ?? null,
        },
      },
    ];
  }

  analyzeNutrition(context: CoachContextDto): CoachInsightDto[] {
    const profile = context.userProfile;
    const nutrition = context.nutritionSummary;

    if (
      !profile ||
      !nutrition ||
      profile.proteinTarget <= 0 ||
      profile.dailyCaloriesTarget <= 0
    ) {
      return [];
    }

    const proteinRatio = nutrition.averageProtein / profile.proteinTarget;
    const calorieDeviationRatio =
      Math.abs(nutrition.averageCalories - profile.dailyCaloriesTarget) /
      profile.dailyCaloriesTarget;
    const hasCriticalSignal =
      proteinRatio < CRITICAL_PROTEIN_RATIO ||
      calorieDeviationRatio > CRITICAL_CALORIE_DEVIATION_RATIO;
    const hasWarningSignal =
      proteinRatio < WARNING_PROTEIN_RATIO ||
      calorieDeviationRatio > WARNING_CALORIE_DEVIATION_RATIO;
    const severity = hasCriticalSignal
      ? CoachInsightSeverity.CRITICAL
      : hasWarningSignal
        ? CoachInsightSeverity.WARNING
        : CoachInsightSeverity.NORMAL;
    const stateDescription =
      severity === CoachInsightSeverity.NORMAL
        ? '近期热量和蛋白质摄入基本符合目标。'
        : severity === CoachInsightSeverity.WARNING
          ? '近期营养执行存在偏差。'
          : '近期营养执行偏差较大。';

    return [
      {
        type: CoachInsightType.NUTRITION,
        severity,
        content: `最近${nutrition.days}天平均摄入 ${nutrition.averageCalories}kcal、蛋白质 ${nutrition.averageProtein}g；目标为 ${profile.dailyCaloriesTarget}kcal、蛋白质 ${profile.proteinTarget}g。${stateDescription}`,
        metadata: {
          averageCalories: nutrition.averageCalories,
          targetCalories: profile.dailyCaloriesTarget,
          calorieDeviationPercent: roundTo(calorieDeviationRatio * 100),
          averageProtein: nutrition.averageProtein,
          targetProtein: profile.proteinTarget,
          proteinTargetAchievementPercent: roundTo(proteinRatio * 100),
          recordCount: nutrition.recordCount,
        },
      },
    ];
  }

  private formatSleepDuration(durationMinutes: number | null): string {
    if (durationMinutes === null) {
      return '无数据';
    }

    return `${roundTo(durationMinutes / 60, 1)}小时`;
  }
}
