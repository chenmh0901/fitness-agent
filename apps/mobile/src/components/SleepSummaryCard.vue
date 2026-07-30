<template>
  <article class="section-card summary-card" aria-labelledby="sleep-card-title">
    <div class="section-card__body">
      <div class="section-card__title-row">
        <h2 id="sleep-card-title">睡眠</h2>
        <span class="status-pill">{{ statusLabel }}</span>
      </div>

      <div v-if="summary.recordCount > 0" class="metric-grid metric-grid--compact">
        <div class="metric">
          <span class="metric__label">最近一次</span>
          <strong class="metric__value">
            {{ formatDuration(latestSleep?.durationMinutes ?? null) }}
          </strong>
        </div>
        <div class="metric">
          <span class="metric__label">7日平均</span>
          <strong class="metric__value">
            {{ formatDuration(summary.averageDurationMinutes) }}
          </strong>
        </div>
        <div class="metric">
          <span class="metric__label">最近质量</span>
          <strong class="metric__value">{{ formatQuality(latestSleep?.quality ?? null) }}</strong>
        </div>
        <div class="metric">
          <span class="metric__label">平均质量</span>
          <strong class="metric__value">{{ formatQuality(summary.averageQuality) }}</strong>
        </div>
      </div>

      <p v-else class="empty-note">暂无睡眠数据，记录后即可查看近期状态。</p>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { SleepSummary } from '@/types/daily-fitness';

const props = defineProps<{
  summary: SleepSummary;
}>();

const statusLabels: Record<SleepSummary['status'], string> = {
  no_data: '无数据',
  good: '状态良好',
  short_duration: '时长不足',
  low_quality: '质量偏低',
  short_duration_and_low_quality: '时长与质量不足',
};

const latestSleep = computed(() => props.summary.recentSleep[0] ?? null);
const statusLabel = computed(() => statusLabels[props.summary.status]);

function formatDuration(minutes: number | null): string {
  if (minutes === null) {
    return '—';
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes === 0 ? `${hours}小时` : `${hours}小时${remainingMinutes}分`;
}

function formatQuality(value: number | null): string {
  return value === null ? '—' : `${value.toFixed(1)} / 5`;
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
