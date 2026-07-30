<template>
  <ion-page>
    <ion-header class="ion-no-border">
      <ion-toolbar class="app-toolbar">
        <ion-title>聊天</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="app-page">
      <main ref="messageContainer" class="app-shell chat-shell">
        <section class="quick-section" aria-label="快捷问题">
          <button
            v-for="question in quickQuestions"
            :key="question.label"
            type="button"
            class="quick-button"
            :disabled="sending"
            @click="sendMessage(question.message)"
          >
            {{ question.label }}
          </button>
        </section>

        <section v-if="messages.length === 0" class="chat-empty">
          <h1>和你的 Fitness Agent 对话</h1>
          <p>可以询问今日状态，也可以直接用自然语言记录体重、睡眠或训练。</p>
          <ul>
            <li>今天早上90.5kg</li>
            <li>昨晚睡了6小时，质量一般</li>
            <li>今天卧推80kg，4组，每组8次，RPE 8</li>
          </ul>
        </section>

        <section v-else class="message-list" aria-live="polite">
          <ChatMessage v-for="message in messages" :key="message.id" :message="message" />
          <div v-if="sending" class="agent-typing">Fitness Agent 正在回复…</div>
        </section>

        <section v-if="error" class="chat-error" role="alert">
          <span>{{ error }}</span>
          <button
            v-if="lastFailedMessage"
            type="button"
            class="text-button"
            :disabled="sending"
            @click="retryLastMessage"
          >
            重试
          </button>
        </section>
      </main>
    </ion-content>

    <ion-footer class="ion-no-border chat-footer">
      <form class="composer" @submit.prevent="sendMessage()">
        <label for="chat-message" class="visually-hidden">发送给 Fitness Agent 的消息</label>
        <textarea
          id="chat-message"
          v-model="draft"
          rows="1"
          placeholder="记录数据或问问今天怎么练…"
          :disabled="sending"
          @keydown.enter.exact.prevent="sendMessage()"
        />
        <button
          type="submit"
          class="primary-button send-button"
          :disabled="sending || !draft.trim()"
        >
          {{ sending ? '发送中' : '发送' }}
        </button>
      </form>
    </ion-footer>
  </ion-page>
</template>

<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from 'vue';
import { IonContent, IonFooter, IonHeader, IonPage, IonTitle, IonToolbar } from '@ionic/vue';
import { getUserFacingError } from '@/api/api-client';
import { sendAgentMessage } from '@/api/agent.api';
import ChatMessage from '@/components/ChatMessage.vue';
import type { ChatMessageItem } from '@/types/agent';

const CHAT_SESSION_KEY = 'fitness-agent.chat-messages';

const quickQuestions = [
  { label: '今日状态', message: '请总结我今天的整体状态。' },
  { label: '最近体重趋势', message: '请分析我最近7天的晨起体重趋势。' },
  { label: '今天练什么', message: '今天安排了什么训练？' },
  { label: '睡眠不好怎么调整', message: '我最近睡眠不好，今天训练应该怎么调整？' },
] as const;

const messages = ref<ChatMessageItem[]>([]);
const draft = ref('');
const sending = ref(false);
const error = ref('');
const lastFailedMessage = ref('');
const messageContainer = ref<HTMLElement | null>(null);
let messageSequence = 0;

function createMessage(role: ChatMessageItem['role'], content: string): ChatMessageItem {
  messageSequence += 1;

  return {
    id: `${Date.now()}-${messageSequence}`,
    role,
    content,
  };
}

function restoreMessages(): void {
  const stored = window.sessionStorage.getItem(CHAT_SESSION_KEY);

  if (!stored) {
    return;
  }

  try {
    const parsed: unknown = JSON.parse(stored);

    if (Array.isArray(parsed)) {
      messages.value = parsed.filter(isChatMessage);
    }
  } catch {
    window.sessionStorage.removeItem(CHAT_SESSION_KEY);
  }
}

function isChatMessage(value: unknown): value is ChatMessageItem {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Partial<ChatMessageItem>;
  return (
    typeof candidate.id === 'string' &&
    (candidate.role === 'user' || candidate.role === 'agent') &&
    typeof candidate.content === 'string'
  );
}

async function sendMessage(message = draft.value, appendUserMessage = true): Promise<void> {
  const normalizedMessage = message.trim();

  if (!normalizedMessage || sending.value) {
    return;
  }

  sending.value = true;
  error.value = '';
  lastFailedMessage.value = '';

  if (appendUserMessage) {
    messages.value.push(createMessage('user', normalizedMessage));
  }

  draft.value = '';
  await scrollToLatest();

  try {
    const response = await sendAgentMessage(normalizedMessage);
    messages.value.push(createMessage('agent', response.answer));
  } catch (requestError) {
    error.value = getUserFacingError(requestError);
    lastFailedMessage.value = normalizedMessage;
  } finally {
    sending.value = false;
    await scrollToLatest();
  }
}

function retryLastMessage(): void {
  const failedMessage = lastFailedMessage.value;

  if (failedMessage) {
    void sendMessage(failedMessage, false);
  }
}

async function scrollToLatest(): Promise<void> {
  await nextTick();
  const container = messageContainer.value;

  if (container) {
    container.scrollIntoView({
      block: 'end',
      behavior: 'smooth',
    });
  }
}

watch(
  messages,
  (value) => {
    window.sessionStorage.setItem(CHAT_SESSION_KEY, JSON.stringify(value));
  },
  { deep: true },
);

onMounted(restoreMessages);
</script>

<style scoped>
.chat-shell {
  display: grid;
  align-content: start;
  gap: 14px;
  min-height: 100%;
}

.quick-section {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 2px 0 4px;
  scrollbar-width: none;
}

.quick-section::-webkit-scrollbar {
  display: none;
}

.quick-button {
  flex: 0 0 auto;
  border: 1px solid #cae0d8;
  border-radius: 999px;
  background: #fff;
  color: var(--ion-color-primary);
  padding: 8px 12px;
  font-size: 0.78rem;
  font-weight: 700;
}

.quick-button:disabled {
  opacity: 0.5;
}

.chat-empty {
  margin-top: 8vh;
  border: 1px solid var(--app-border);
  border-radius: 20px;
  background: #fff;
  padding: 20px;
}

.chat-empty h1 {
  margin: 0 0 8px;
  font-size: 1.1rem;
}

.chat-empty p,
.chat-empty li {
  color: var(--app-muted);
  font-size: 0.84rem;
  line-height: 1.55;
}

.chat-empty ul {
  margin: 14px 0 0;
  padding-left: 20px;
}

.message-list {
  display: grid;
  gap: 12px;
  padding-bottom: 10px;
}

.agent-typing {
  color: var(--app-muted);
  font-size: 0.78rem;
}

.chat-error {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  border-radius: 12px;
  background: #fff4f4;
  color: var(--app-danger);
  padding: 9px 12px;
  font-size: 0.82rem;
}

.chat-footer {
  background: rgba(255, 255, 255, 0.98);
  border-top: 1px solid var(--app-border);
}

.composer {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 9px;
  width: min(100%, 680px);
  margin: 0 auto;
  padding: 10px 14px max(10px, env(safe-area-inset-bottom));
}

.composer textarea {
  width: 100%;
  max-height: 110px;
  resize: none;
  border: 1px solid #cddbd6;
  border-radius: 13px;
  outline: none;
  background: #f8fbf9;
  color: var(--ion-text-color);
  padding: 11px 12px;
  line-height: 1.4;
}

.composer textarea:focus {
  border-color: var(--ion-color-primary);
  box-shadow: 0 0 0 3px rgba(31, 107, 90, 0.1);
}

.send-button {
  align-self: end;
  min-width: 64px;
}
</style>
