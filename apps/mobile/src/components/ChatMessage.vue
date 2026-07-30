<template>
  <div class="message-row" :class="`message-row--${message.role}`">
    <div class="message-bubble">
      <span class="message-author">{{ message.role === 'user' ? '你' : 'Fitness Agent' }}</span>
      <p>{{ message.content }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ChatMessageItem } from '@/types/agent';

defineProps<{
  message: ChatMessageItem;
}>();
</script>

<style scoped>
.message-row {
  display: flex;
}

.message-row--user {
  justify-content: flex-end;
}

.message-bubble {
  max-width: min(86%, 520px);
  border: 1px solid var(--app-border);
  border-radius: 16px 16px 16px 5px;
  background: var(--app-surface);
  padding: 11px 13px;
  box-shadow: 0 5px 16px rgba(27, 77, 65, 0.05);
}

.message-row--user .message-bubble {
  border-color: var(--ion-color-primary);
  border-radius: 16px 16px 5px;
  background: var(--ion-color-primary);
  color: #fff;
}

.message-author {
  display: block;
  margin-bottom: 4px;
  color: var(--app-muted);
  font-size: 0.66rem;
  font-weight: 700;
}

.message-row--user .message-author {
  color: rgba(255, 255, 255, 0.72);
}

.message-bubble p {
  margin: 0;
  font-size: 0.9rem;
  line-height: 1.62;
  white-space: pre-wrap;
}
</style>
