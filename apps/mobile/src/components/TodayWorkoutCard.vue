<template>
  <article class="section-card" aria-labelledby="workout-card-title">
    <div class="section-card__body">
      <div class="section-card__title-row">
        <h2 id="workout-card-title">今日训练</h2>
        <span v-if="workout" class="status-pill">{{ workout.trainingCycle.name }}</span>
      </div>

      <p v-if="!workout || workout.exercises.length === 0" class="empty-note workout-empty">
        今天没有安排训练。
      </p>

      <ol v-else class="exercise-list">
        <li v-for="exercise in workout.exercises" :key="exercise.id" class="exercise-item">
          <span class="exercise-order">{{ exercise.order }}</span>
          <div class="exercise-main">
            <div class="exercise-heading">
              <strong>{{ exercise.exerciseName }}</strong>
              <span>{{ exercise.category }}</span>
            </div>
            <p>
              {{ exercise.sets }} 组 × {{ exercise.reps }} 次
              <template v-if="exercise.targetWeight !== null">
                · {{ exercise.targetWeight }} kg
              </template>
              <template v-if="exercise.targetRpe !== null">
                · RPE {{ exercise.targetRpe }}
              </template>
            </p>
          </div>
        </li>
      </ol>
    </div>
  </article>
</template>

<script setup lang="ts">
import type { TodayWorkout } from '@/types/daily-fitness';

defineProps<{
  workout: TodayWorkout | null;
}>();
</script>

<style scoped>
.workout-empty {
  margin-top: 2px;
}

.exercise-list {
  display: grid;
  gap: 12px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.exercise-item {
  display: grid;
  grid-template-columns: 30px minmax(0, 1fr);
  gap: 11px;
  align-items: start;
}

.exercise-order {
  display: grid;
  width: 30px;
  height: 30px;
  place-items: center;
  border-radius: 9px;
  background: var(--app-soft);
  color: var(--ion-color-primary);
  font-size: 0.82rem;
  font-weight: 800;
}

.exercise-heading {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  align-items: baseline;
}

.exercise-heading strong {
  font-size: 0.94rem;
}

.exercise-heading span {
  color: var(--app-muted);
  font-size: 0.72rem;
}

.exercise-main p {
  margin: 4px 0 0;
  color: var(--app-muted);
  font-size: 0.82rem;
}
</style>
