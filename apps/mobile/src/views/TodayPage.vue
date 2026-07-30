<template>
  <ion-page>
    <ion-header class="ion-no-border">
      <ion-toolbar class="app-toolbar">
        <ion-title>今日</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="app-page">
      <main class="app-shell today-shell">
        <div v-if="loading && !summary" class="loading-panel" aria-live="polite">
          <div>
            <ion-spinner name="crescent" />
            <p>正在加载今日状态…</p>
          </div>
        </div>

        <section v-else-if="error && !summary" class="error-panel" role="alert">
          <strong>今日状态加载失败</strong>
          <p>{{ error }}</p>
          <button type="button" class="primary-button" @click="loadSummary">点击重试</button>
        </section>

        <template v-else-if="summary">
          <header class="today-header">
            <div>
              <p class="today-date">{{ formattedDate }}</p>
              <h1>当前目标：{{ goalLabel }}</h1>
            </div>
            <button
              type="button"
              class="secondary-button refresh-button"
              :disabled="loading"
              aria-label="刷新今日状态"
              @click="loadSummary"
            >
              {{ loading ? '刷新中…' : '刷新' }}
            </button>
          </header>

          <div v-if="error" class="inline-error" role="alert">
            {{ error }}
            <button type="button" class="text-button" @click="loadSummary">重试</button>
          </div>

          <section class="summary-grid" aria-label="体重与睡眠摘要">
            <WeightSummaryCard :summary="summary.weightSummary" />
            <SleepSummaryCard :summary="summary.sleepSummary" />
          </section>

          <TodayWorkoutCard :workout="summary.todayWorkout" />

          <AgentSuggestionCard
            :answer="suggestion"
            :error="suggestionError"
            :loading="suggestionLoading"
            @generate="generateSuggestion"
          />
        </template>
      </main>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { IonContent, IonHeader, IonPage, IonSpinner, IonTitle, IonToolbar } from '@ionic/vue';
import { getUserFacingError } from '@/api/api-client';
import { sendAgentMessage } from '@/api/agent.api';
import { getTodayFitnessSummary } from '@/api/daily-fitness.api';
import AgentSuggestionCard from '@/components/AgentSuggestionCard.vue';
import SleepSummaryCard from '@/components/SleepSummaryCard.vue';
import TodayWorkoutCard from '@/components/TodayWorkoutCard.vue';
import WeightSummaryCard from '@/components/WeightSummaryCard.vue';
import type { DailyFitnessSummary, FitnessGoal } from '@/types/daily-fitness';

const DAILY_SUGGESTION_PROMPT =
  '请根据我的基础信息、近期体重趋势、睡眠状态、今日训练计划和最近训练表现，生成今天的饮食与训练建议。只针对今天提出建议，不修改长期计划。请说明建议依据了哪些个人数据。';

const summary = ref<DailyFitnessSummary | null>(null);
const loading = ref(true);
const error = ref('');
const suggestion = ref('');
const suggestionError = ref('');
const suggestionLoading = ref(false);

const goalLabels: Record<FitnessGoal, string> = {
  FAT_LOSS: '减脂',
  MUSCLE_GAIN: '增肌',
  MAINTENANCE: '维持',
};

const formattedDate = computed(() => {
  if (!summary.value) {
    return '';
  }

  const [year, month, day] = summary.value.localDate.split('-').map(Number);
  return `${year}年${month}月${day}日`;
});

const goalLabel = computed(() => {
  const goal = summary.value?.recommendationsContext.userProfile?.goal;
  return goal ? goalLabels[goal] : '尚未设置';
});

async function loadSummary(): Promise<void> {
  loading.value = true;
  error.value = '';

  try {
    summary.value = await getTodayFitnessSummary();
  } catch (requestError) {
    error.value = getUserFacingError(requestError);
  } finally {
    loading.value = false;
  }
}

async function generateSuggestion(): Promise<void> {
  if (suggestionLoading.value) {
    return;
  }

  suggestionLoading.value = true;
  suggestionError.value = '';

  try {
    const response = await sendAgentMessage(DAILY_SUGGESTION_PROMPT);
    suggestion.value = response.answer;
  } catch (requestError) {
    suggestionError.value = getUserFacingError(requestError);
  } finally {
    suggestionLoading.value = false;
  }
}

onMounted(loadSummary);
</script>

<style scoped>
.today-shell {
  display: grid;
  gap: 14px;
}

.today-header {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 16px;
  padding: 5px 2px 2px;
}

.today-date {
  margin: 0 0 5px;
  color: var(--app-muted);
  font-size: 0.82rem;
}

.today-header h1 {
  margin: 0;
  font-size: 1.28rem;
  line-height: 1.28;
}

.refresh-button {
  flex: 0 0 auto;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.inline-error {
  border-radius: 12px;
  background: #fff4f4;
  color: var(--app-danger);
  padding: 9px 12px;
  font-size: 0.82rem;
}

.error-panel p {
  margin: 8px 0 14px;
  line-height: 1.5;
}

@media (max-width: 360px) {
  .summary-grid {
    grid-template-columns: 1fr;
  }
}
</style>
