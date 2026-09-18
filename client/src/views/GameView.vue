<template>
  <main class="game" v-if="game">
    <header class="top panel">
      <div class="meters">
        <span>提示 {{ game.hints }}/8</span>
        <span>失误 {{ 3 - game.fuses }}/3</span>
        <span>牌库 {{ game.deckCount }}</span>
      </div>
      <p class="turn">
        <template v-if="game.result">对局结束</template>
        <template v-else-if="store.waitingReconnect">
          等待 {{ currentName }} 重连中…
        </template>
        <template v-else>
          当前回合：{{ currentName }}
          <strong v-if="store.isMyTurn">（你的回合）</strong>
        </template>
      </p>
    </header>

    <section class="panel fireworks">
      <div v-for="color in COLORS" :key="color" class="fw" :class="color">
        <span>{{ COLOR_LABELS[color] }}</span>
        <strong>{{ game.fireworks[color] || '·' }}</strong>
      </div>
    </section>

    <section class="others stack">
      <div v-for="pid in otherPlayerIds" :key="pid" class="panel player-block">
        <div class="player-head">
          <strong>{{ nameOf(pid) }}</strong>
          <span v-if="!connectedOf(pid)" class="offline">离线</span>
          <span v-if="game.currentPlayerId === pid" class="badge">行动中</span>
        </div>
        <div class="hand-row">
          <HanabiCard
            v-for="card in game.hands[pid]"
            :key="card.id"
            :card="card"
            :highlight="hintTarget === pid && hintPreviewIndexes.includes(cardIndex(pid, card.id))"
            disabled
          />
        </div>
      </div>
    </section>

    <section class="panel my-area">
      <div class="player-head">
        <strong>我的手牌</strong>
        <button class="link" type="button" @click="showDiscard = !showDiscard">
          弃牌区 ({{ game.discard.length }})
        </button>
      </div>
      <div class="hand-row">
        <HanabiCard
          v-for="card in myHand"
          :key="card.id"
          :card="card"
          hidden
          :selected="selectedCardId === card.id"
          :disabled="!canAct"
          @select="selectedCardId = card.id"
        />
      </div>

      <div v-if="showDiscard" class="discard">
        <HanabiCard v-for="card in game.discard" :key="card.id" :card="card" disabled />
      </div>

      <div v-if="!game.result" class="actions">
        <button class="btn" :disabled="!canAct || !selectedCardId" @click="confirmPlay">出牌</button>
        <button class="btn secondary" :disabled="!canAct || !selectedCardId || game.hints >= 8" @click="confirmDiscard">
          弃牌
        </button>
        <button class="btn ghost" :disabled="!canAct || game.hints <= 0" @click="openHint = true">
          提示
        </button>
      </div>

      <div v-else class="result panel-inner">
        <p>{{ resultText(game.result, game.score, game.scoreLabel) }}</p>
        <button v-if="store.isHost" class="btn" @click="onRematch">再来一局</button>
        <button class="btn secondary" @click="router.push(`/room/${store.room.roomCode}`)">回大厅</button>
      </div>
    </section>

    <p v-if="store.error" class="error">{{ store.error }}</p>

    <div v-if="openHint" class="modal">
      <div class="panel modal-card stack">
        <h3>给出提示</h3>
        <label class="muted">选择队友</label>
        <div class="chip-row">
          <button
            v-for="pid in otherPlayerIds"
            :key="pid"
            type="button"
            class="chip"
            :class="{ on: hintTarget === pid }"
            @click="hintTarget = pid"
          >
            {{ nameOf(pid) }}
          </button>
        </div>

        <label class="muted">提示类型</label>
        <div class="chip-row">
          <button type="button" class="chip" :class="{ on: hintType === 'color' }" @click="hintType = 'color'">颜色</button>
          <button type="button" class="chip" :class="{ on: hintType === 'value' }" @click="hintType = 'value'">数字</button>
        </div>

        <div class="chip-row">
          <template v-if="hintType === 'color'">
            <button
              v-for="c in COLORS"
              :key="c"
              type="button"
              class="chip"
              :class="[c, { on: hintValue === c }]"
              @click="hintValue = c"
            >
              {{ COLOR_LABELS[c] }}
            </button>
          </template>
          <template v-else>
            <button
              v-for="n in [1, 2, 3, 4, 5]"
              :key="n"
              type="button"
              class="chip"
              :class="{ on: hintValue === n }"
              @click="hintValue = n"
            >
              {{ n }}
            </button>
          </template>
        </div>

        <p v-if="hintTarget && hintValue != null" class="muted">
          将指出 {{ hintPreviewIndexes.length }} 张牌
        </p>

        <button class="btn" :disabled="!canSubmitHint" @click="submitHint">确认提示</button>
        <button class="btn ghost" @click="closeHint">取消</button>
      </div>
    </div>
  </main>
  <main v-else class="panel">加载对局中…</main>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import HanabiCard from '../components/HanabiCard.vue';
import { COLOR_LABELS, COLORS, resultText } from '../lib/labels';
import { useRoomStore } from '../stores/room';

const store = useRoomStore();
const route = useRoute();
const router = useRouter();

const selectedCardId = ref(null);
const showDiscard = ref(false);
const openHint = ref(false);
const hintTarget = ref('');
const hintType = ref('color');
const hintValue = ref(null);

const game = computed(() => store.room?.game || null);
const myHand = computed(() => game.value?.hands?.[store.playerId] || []);
const otherPlayerIds = computed(
  () => game.value?.playerOrder?.filter((id) => id !== store.playerId) || [],
);
const canAct = computed(
  () => store.isMyTurn && !store.waitingReconnect && !game.value?.result,
);

const currentName = computed(() => nameOf(game.value?.currentPlayerId));

const hintPreviewIndexes = computed(() => {
  if (!hintTarget.value || hintValue.value == null || !game.value) return [];
  const hand = game.value.hands[hintTarget.value] || [];
  return hand
    .map((c, i) => {
      if (hintType.value === 'color') return c.color === hintValue.value ? i : -1;
      return c.value === hintValue.value ? i : -1;
    })
    .filter((i) => i >= 0);
});

const canSubmitHint = computed(
  () =>
    Boolean(hintTarget.value) &&
    hintValue.value != null &&
    hintPreviewIndexes.value.length > 0 &&
    canAct.value,
);

onMounted(async () => {
  try {
    const room = await store.refreshRoom(route.params.code);
    if (room.status === 'waiting') {
      router.replace(`/room/${room.roomCode}`);
    }
  } catch (e) {
    store.setError(e.message);
  }
});

watch(
  () => store.room?.status,
  (status) => {
    if (status === 'waiting') router.replace(`/room/${store.room.roomCode}`);
  },
);

function nameOf(pid) {
  return store.room?.players?.find((p) => p.id === pid)?.name || '玩家';
}

function connectedOf(pid) {
  return store.room?.players?.find((p) => p.id === pid)?.connected;
}

function cardIndex(pid, cardId) {
  return game.value.hands[pid].findIndex((c) => c.id === cardId);
}

function confirmPlay() {
  if (!selectedCardId.value) return;
  if (!window.confirm('确认打出这张牌？')) return;
  store.play({ cardId: selectedCardId.value });
  selectedCardId.value = null;
}

function confirmDiscard() {
  if (!selectedCardId.value) return;
  if (!window.confirm('确认弃掉这张牌？')) return;
  store.discard({ cardId: selectedCardId.value });
  selectedCardId.value = null;
}

function closeHint() {
  openHint.value = false;
  hintTarget.value = '';
  hintValue.value = null;
}

function submitHint() {
  store.hint({
    targetPlayerId: hintTarget.value,
    type: hintType.value,
    value: hintValue.value,
  });
  closeHint();
}

async function onRematch() {
  try {
    await store.rematch();
  } catch (e) {
    store.setError(e.message);
  }
}
</script>

<style scoped>
.top {
  margin-bottom: 12px;
}

.meters {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  font-size: 13px;
  color: var(--muted);
}

.turn {
  margin: 10px 0 0;
  font-size: 15px;
}

.fireworks {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;
  margin-bottom: 12px;
  text-align: center;
}

.fw {
  border-radius: 12px;
  padding: 10px 4px;
  background: rgba(255, 255, 255, 0.05);
}

.fw strong {
  display: block;
  font-size: 22px;
  margin-top: 4px;
}

.fw.red { color: var(--red); }
.fw.yellow { color: var(--yellow); }
.fw.green { color: var(--green); }
.fw.blue { color: var(--blue); }
.fw.white { color: var(--white); }

.player-block,
.my-area {
  margin-bottom: 12px;
}

.player-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.badge {
  font-size: 12px;
  color: var(--accent);
}

.offline {
  font-size: 12px;
  color: var(--danger);
}

.hand-row,
.discard {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 4px;
}

.actions {
  display: grid;
  gap: 8px;
  margin-top: 12px;
}

.link {
  margin-left: auto;
  background: none;
  border: 0;
  color: var(--accent-2);
  padding: 0;
}

.modal {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  display: grid;
  place-items: end center;
  padding: 16px;
  z-index: 20;
}

.modal-card {
  width: min(480px, 100%);
  margin-bottom: env(safe-area-inset-bottom);
}

.chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.chip {
  border: 1px solid var(--line);
  background: rgba(255, 255, 255, 0.05);
  color: var(--ink);
  border-radius: 999px;
  padding: 10px 14px;
}

.chip.on {
  border-color: var(--accent-2);
  background: rgba(62, 199, 194, 0.18);
}

.result {
  margin-top: 12px;
  display: grid;
  gap: 8px;
}

h3 {
  margin: 0;
}
</style>
