<template>
  <article class="section-card suggestion-card" aria-labelledby="suggestion-card-title">
    <div class="section-card__body">
      <div class="section-card__title-row">
        <div>
          <span class="suggestion-eyebrow">FITNESS AGENT</span>
          <h2 id="suggestion-card-title">今日建议</h2>
        </div>
        <button
          type="button"
          class="primary-button suggestion-action"
          :disabled="loading"
          @click="$emit('generate')"
        >
          {{ loading ? '生成中…' : answer ? '重新生成' : '生成今日建议' }}
        </button>
      </div>

      <p v-if="!answer && !error" class="empty-note">
        需要时再生成，避免每次打开页面都产生模型费用。
      </p>
      <p v-if="error" class="suggestion-error" role="alert">{{ error }}</p>
      <div v-if="answer" class="suggestion-answer">{{ answer }}</div>
    </div>
  </article>
</template>

<script setup lang="ts">
defineProps<{
  answer: string;
  error: string;
  loading: boolean;
}>();

defineEmits<{
  generate: [];
}>();
</script>

<style scoped>
.suggestion-card {
  border-color: #cfe4dc;
  background: linear-gradient(145deg, #ffffff 0%, #f2faf7 100%);
}

.suggestion-eyebrow {
  display: block;
  margin-bottom: 4px;
  color: var(--ion-color-primary);
  font-size: 0.64rem;
  font-weight: 800;
  letter-spacing: 0.12em;
}

.suggestion-action {
  flex: 0 0 auto;
  padding: 10px 12px;
  font-size: 0.78rem;
}

.suggestion-answer {
  color: #29483f;
  font-size: 0.9rem;
  line-height: 1.7;
  white-space: pre-wrap;
}

.suggestion-error {
  margin: 0;
  color: var(--app-danger);
  font-size: 0.86rem;
  line-height: 1.5;
}
</style>
