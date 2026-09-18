<template>
  <main class="home">
    <header class="hero">
      <p class="eyebrow">合作卡牌</p>
      <h1>HANABI</h1>
      <p class="muted">看不见自己的手牌，靠提示一起点亮烟花。</p>
    </header>

    <section class="panel stack">
      <div class="field">
        <label for="name">昵称</label>
        <input id="name" v-model.trim="name" maxlength="12" placeholder="怎么称呼你" />
      </div>

      <button class="btn" :disabled="!name || store.loading" @click="onCreate">
        创建房间
      </button>

      <div class="divider muted">或加入已有房间</div>

      <div class="field">
        <label for="code">房间码</label>
        <input
          id="code"
          v-model.trim="code"
          maxlength="6"
          placeholder="例如 AB12CD"
          style="text-transform: uppercase"
        />
      </div>
      <button class="btn secondary" :disabled="!name || !code || store.loading" @click="onJoin">
        加入房间
      </button>

      <p v-if="store.error" class="error">{{ store.error }}</p>
    </section>
  </main>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useRoomStore } from '../stores/room';

const store = useRoomStore();
const router = useRouter();
const name = ref(store.playerName || '');
const code = ref('');

async function onCreate() {
  const room = await store.createRoom(name.value);
  router.push(`/room/${room.roomCode}`);
}

async function onJoin() {
  const room = await store.joinRoom(code.value.toUpperCase(), name.value);
  router.push(`/room/${room.roomCode}`);
}
</script>

<style scoped>
.hero {
  padding: 28px 8px 22px;
  text-align: center;
}

.eyebrow {
  margin: 0 0 8px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--accent-2);
  font-size: 12px;
}

h1 {
  margin: 0;
  font-size: 48px;
  letter-spacing: 0.08em;
  font-weight: 800;
}

.divider {
  text-align: center;
  margin: 4px 0;
}
</style>
