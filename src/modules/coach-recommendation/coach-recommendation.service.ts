import { Injectable } from '@nestjs/common';
import {
  CoachInsightSeverity,
  CoachInsightType,
  FitnessGoalType,
} from '../../generated/prisma/client';
import { roundTo } from '../../common/utils/number.util';
import type { CoachContextWithInsightsDto } from '../agent/context/coach-context-with-insights.dto';
import { CoachInsightDto } from '../coach-insight/dto/coach-insight.dto';
import { ExerciseProgressTrend } from '../workout/dto/exercise-performance.dto';
import {
  CoachRecommendationDto,
  CoachRecommendationType,
} from './dto/coach-recommendation.dto';

export type CoachRecommendationInput = Pick<
  CoachContextWithInsightsDto,
  'coachContext' | 'status' | 'insights'
>;

@Injectable()
export class CoachRecommendationService {
  generateRecommendations(context: CoachRecommendationInput): CoachRecommendationDto[] {
    return [
      ...this.getWeightRecommendations(context),
      ...this.getTrainingRecommendations(context),
      ...this.getRecoveryRecommendations(context),
      ...this.getNutritionRecommendations(context),
    ];
  }

  private getWeightRecommendations(
    context: CoachRecommendationInput,
  ): CoachRecommendationDto[] {
    const goal = context.coachContext.activeGoal;
    const insight = this.findActionableInsight(context.insights, CoachInsightType.WEIGHT);

    if (!goal || !insight) {
      return [];
    }

    const actualWeeklyChange =
      context.coachContext.weightTrend.recent7Days.weeklyAverageChange;
    const isFatLossGoal = goal.type === FitnessGoalType.FAT_LOSS;
    const action = isFatLossGoal
      ? `未来7天保持当前长期计划不变，继续记录晨起体重，并将每日平均热量对齐 ${context.coachContext.userProfile?.dailyCaloriesTarget ?? '既定目标'}kcal；7天后再用周均变化复查是否仍停滞。`
      : '未来7天保持当前长期计划不变，继续记录晨起体重，并在下一次周趋势形成后重新评估目标速度。';

    return [
      {
        type: CoachRecommendationType.GOAL,
        action,
        reason: `${insight.content} 当前实际每周变化为 ${actualWeeklyChange ?? '无数据'}kg，尚不足以支持自动修改长期计划。`,
      },
    ];
  }

  private getTrainingRecommendations(
    context: CoachRecommendationInput,
  ): CoachRecommendationDto[] {
    const decliningPerformance = context.coachContext.recentExercisePerformance.filter(
      ({ progressTrend }) => progressTrend === ExerciseProgressTrend.DECLINING,
    );

    if (decliningPerformance.length > 0) {
      return decliningPerformance.map((performance) => {
        const load = performance.lastWeight ?? performance.actualWeight;
        const loadDescription = load === null ? '当前负重' : `${load}kg`;
        const isHighEffort = (performance.lastRpe ?? performance.rpe ?? 0) >= 9;
        const action = isHighEffort
          ? `下次 ${performance.exerciseName} 将 ${loadDescription} 下调 2.5%-5% 或减少一组，把最后一组控制在 RPE 8 以内，并记录完成情况。`
          : `下次 ${performance.exerciseName} 暂不增加负重，先用 ${loadDescription} 完成 ${performance.lastSets} 组 × ${performance.lastReps} 次并记录 RPE。`;

        return {
          type: CoachRecommendationType.TRAINING,
          action,
          reason: `${performance.exerciseName} 的 progressTrend 为 declining；最近记录为 ${loadDescription}、${performance.lastSets}组×${performance.lastReps}次、RPE ${performance.lastRpe ?? '无数据'}，completed=${performance.completed}。`,
        };
      });
    }

    const adherenceInsight = this.findActionableInsight(
      context.insights,
      CoachInsightType.TRAINING,
    );

    if (!adherenceInsight) {
      return [];
    }

    const { trainingAdherence } = context.coachContext;

    return [
      {
        type: CoachRecommendationType.TRAINING,
        action:
          '优先完成下一次已安排训练；如果时间不足，保留主动作和记录，不额外增加补偿训练。',
        reason: `${adherenceInsight.content} 最近${trainingAdherence.days}天完成 ${trainingAdherence.completedSessions}/${trainingAdherence.plannedSessions} 次，执行率 ${trainingAdherence.adherenceRate ?? '无数据'}%。`,
      },
    ];
  }

  private getRecoveryRecommendations(
    context: CoachRecommendationInput,
  ): CoachRecommendationDto[] {
    const insight = this.findActionableInsight(context.insights, CoachInsightType.RECOVERY);

    if (!insight) {
      return [];
    }

    const isCritical = insight.severity === CoachInsightSeverity.CRITICAL;

    return [
      {
        type: CoachRecommendationType.RECOVERY,
        action: isCritical
          ? '今天不进行冲击重量或力竭组，将主训练控制在 RPE 7 以内并减少约20%训练量；今晚优先保证至少7小时睡眠。'
          : '今天不追加额外训练量，将主要动作控制在 RPE 8 以内，并优先保证今晚至少7小时睡眠。',
        reason: insight.content,
      },
    ];
  }

  private getNutritionRecommendations(
    context: CoachRecommendationInput,
  ): CoachRecommendationDto[] {
    const insight = this.findActionableInsight(context.insights, CoachInsightType.NUTRITION);
    const profile = context.coachContext.userProfile;
    const nutrition = context.coachContext.nutritionSummary;

    if (!insight || !profile || !nutrition) {
      return [];
    }

    const proteinGap = roundTo(profile.proteinTarget - nutrition.averageProtein);
    const calorieGap = roundTo(profile.dailyCaloriesTarget - nutrition.averageCalories);
    let action: string;

    if (proteinGap > 0) {
      action = `未来7天将每日蛋白质增加约 ${proteinGap}g，使日均摄入接近 ${profile.proteinTarget}g；日均热量保持在 ${profile.dailyCaloriesTarget}kcal 附近。`;
    } else if (calorieGap > 0) {
      action = `未来7天将日均热量增加约 ${calorieGap}kcal，使摄入接近 ${profile.dailyCaloriesTarget}kcal，同时维持至少 ${profile.proteinTarget}g 蛋白质。`;
    } else {
      action = `未来7天将日均热量减少约 ${Math.abs(calorieGap)}kcal，使摄入接近 ${profile.dailyCaloriesTarget}kcal，同时维持至少 ${profile.proteinTarget}g 蛋白质。`;
    }

    return [
      {
        type: CoachRecommendationType.NUTRITION,
        action,
        reason: insight.content,
      },
    ];
  }

  private findActionableInsight(
    insights: CoachInsightDto[],
    type: CoachInsightType,
  ): CoachInsightDto | undefined {
    return insights.find(
      (insight) =>
        insight.type === type && insight.severity !== CoachInsightSeverity.NORMAL,
    );
  }
}
