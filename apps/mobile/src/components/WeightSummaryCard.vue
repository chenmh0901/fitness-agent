<template>
  <article class="section-card summary-card" aria-labelledby="weight-card-title">
    <div class="section-card__body">
      <div class="section-card__title-row">
        <h2 id="weight-card-title">体重</h2>
        <span class="status-pill">{{ trendLabel }}</span>
      </div>

      <div v-if="summary.recordCount > 0" class="metric-grid metric-grid--compact">
        <div class="metric">
          <span class="metric__label">最近晨起</span>
          <strong class="metric__value">{{ formatWeight(summary.latestWeight) }}</strong>
        </div>
        <div class="metric">
          <span class="metric__label">7日平均</span>
          <strong class="metric__value">{{ formatWeight(summary.averageWeight) }}</strong>
        </div>
        <div class="metric">
          <span class="metric__label">变化量</span>
          <strong class="metric__value">{{ formatChange(summary.change) }}</strong>
        </div>
        <div class="metric">
          <span class="metric__label">记录数</span>
          <strong class="metric__value">{{ summary.recordCount }} 次</strong>
        </div>
      </div>

      <p v-else class="empty-note">暂无晨起体重数据，记录后即可查看趋势。</p>
      <p v-if="summary.trend === 'insufficient_data' && summary.recordCount > 0" class="empty-note">
        当前数据量不足，暂时无法判断变化趋势。
      </p>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { WeightSummary } from '@/types/daily-fitness';

const props = defineProps<{
  summary: WeightSummary;
}>();

const trendLabels: Record<WeightSummary['trend'], string> = {
  insufficient_data: '数据不足',
  decreasing: '下降',
  stable: '稳定',
  increasing: '上升',
};

const trendLabel = computed(() => trendLabels[props.summary.trend]);

function formatWeight(value: number | null): string {
  return value === null ? '—' : `${value.toFixed(1)} kg`;
}

function formatChange(value: number | null): string {
  if (value === null) {
    return '—';
  }

  const prefix = value > 0 ? '+' : '';
  return `${prefix}${value.toFixed(1)} kg`;
}
</script>

<style scoped>
.summary-card {
  height: 100%;
}

.metric-grid--compact {
  grid-template-columns: 1fr;
  gap: 10px;
}

@media (min-width: 520px) {
  .metric-grid--compact {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
