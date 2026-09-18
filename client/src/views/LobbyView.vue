<template>
  <main class="lobby stack" v-if="store.room">
    <header class="panel">
      <div class="row">
        <div>
          <p class="muted">房间码</p>
          <h2>{{ store.room.roomCode }}</h2>
        </div>
        <button class="btn ghost copy" type="button" @click="copyCode">复制</button>
      </div>
      <p class="muted">分享房间码给朋友，2～5 人即可开局。断线后只等重连，不代打、不跳过。</p>
    </header>

    <section class="panel">
      <h3>玩家</h3>
      <ul class="players">
        <li v-for="p in store.room.players" :key="p.id">
          <span>
            {{ p.name }}
            <small v-if="p.id === store.room.hostPlayerId">房主</small>
            <small v-if="p.id === store.playerId">我</small>
          </span>
          <span class="status" :class="{ on: p.ready && p.connected, off: !p.connected }">
            {{ !p.connected ? '离线' : p.ready ? '已准备' : '未准备' }}
          </span>
        </li>
      </ul>
    </section>

    <section class="stack actions">
      <button class="btn secondary" @click="store.toggleReady">
        {{ store.me?.ready ? '取消准备' : '准备' }}
      </button>
      <button
        v-if="store.isHost"
        class="btn"
        :disabled="store.room.players.length < 2 || !allReady"
        @click="onStart"
      >
        开始游戏
      </button>
      <button class="btn ghost" @click="router.push('/')">返回首页</button>
      <p v-if="store.error" class="error">{{ store.error }}</p>
    </section>
  </main>
  <main v-else class="panel">加载房间中…</main>
</template>

<script setup>
import { computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useRoomStore } from '../stores/room';

const store = useRoomStore();
const route = useRoute();
const router = useRouter();

const allReady = computed(() => store.room?.players.every((p) => p.ready));

onMounted(async () => {
  try {
    const room = await store.refreshRoom(route.params.code);
    if (room.status === 'playing' || room.status === 'finished') {
      router.replace(`/room/${room.roomCode}/play`);
    }
  } catch (e) {
    store.setError(e.message);
  }
});

watch(
  () => store.room?.status,
  (status) => {
    if (status === 'playing' || status === 'finished') {
      router.replace(`/room/${store.room.roomCode}/play`);
    }
  },
);

async function onStart() {
  try {
    await store.startGame();
    router.push(`/room/${store.room.roomCode}/play`);
  } catch (e) {
    store.setError(e.message);
  }
}

async function copyCode() {
  try {
    await navigator.clipboard.writeText(store.room.roomCode);
  } catch {
    // ignore
  }
}
</script>

<style scoped>
h2,
h3 {
  margin: 0;
}

.row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.copy {
  width: auto;
  padding-inline: 14px;
}

.players {
  list-style: none;
  padding: 0;
  margin: 12px 0 0;
  display: grid;
  gap: 10px;
}

.players li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.04);
}

small {
  margin-left: 6px;
  color: var(--accent-2);
}

.status {
  font-size: 13px;
  color: var(--muted);
}

.status.on {
  color: var(--ok);
}

.status.off {
  color: var(--danger);
}
</style>
