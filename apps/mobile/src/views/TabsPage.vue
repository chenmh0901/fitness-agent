<template>
  <ion-page>
    <ion-tabs>
      <ion-router-outlet />
      <ion-tab-bar slot="bottom" class="app-tab-bar">
        <ion-tab-button tab="today" href="/tabs/today">
          <ion-icon :icon="todayOutline" />
          <ion-label>今日</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="chat" href="/tabs/chat">
          <ion-icon :icon="chatbubbleEllipsesOutline" />
          <ion-label>聊天</ion-label>
        </ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonIcon,
  IonLabel,
  IonPage,
  IonRouterOutlet,
  IonTabBar,
  IonTabButton,
  IonTabs,
} from '@ionic/vue';
import { chatbubbleEllipsesOutline, todayOutline } from 'ionicons/icons';
</script>
