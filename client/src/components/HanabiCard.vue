<template>
  <button
    type="button"
    class="hanabi-card"
    :class="[
      colorClass,
      { selected, hidden: isHidden, hinted: isHinted },
    ]"
    :disabled="disabled"
    @click="$emit('select')"
  >
    <template v-if="isHidden">
      <span class="back">?</span>
      <span v-if="card.hints?.color" class="tag color">{{ COLOR_LABELS[card.hints.color] }}</span>
      <span v-if="card.hints?.value" class="tag value">{{ card.hints.value }}</span>
    </template>
    <template v-else>
      <span class="rank">{{ card.value }}</span>
      <span class="suit">{{ COLOR_LABELS[card.color] }}</span>
    </template>
  </button>
</template>

<script setup>
import { computed } from 'vue';
import { COLOR_LABELS } from '../lib/labels';

const props = defineProps({
  card: { type: Object, required: true },
  hidden: { type: Boolean, default: false },
  selected: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  highlight: { type: Boolean, default: false },
});

defineEmits(['select']);

const isHidden = computed(() => props.hidden || (!props.card.color && !props.card.value));
const colorClass = computed(() => {
  if (isHidden.value) return props.card.hints?.color || 'unknown';
  return props.card.color;
});
const isHinted = computed(
  () => props.highlight || Boolean(props.card.hints?.color || props.card.hints?.value),
);
</script>

<style scoped>
.hanabi-card {
  width: 58px;
  height: 82px;
  border-radius: 12px;
  border: 2px solid rgba(255, 255, 255, 0.18);
  background: #1a2d45;
  color: white;
  display: grid;
  place-items: center;
  position: relative;
  padding: 0;
  cursor: pointer;
  flex: 0 0 auto;
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.25);
}

.hanabi-card.selected {
  outline: 2px solid var(--accent);
  transform: translateY(-4px);
}

.hanabi-card.hinted {
  box-shadow: 0 0 0 2px rgba(62, 199, 194, 0.7);
}

.hanabi-card:disabled {
  cursor: default;
}

.rank {
  font-size: 28px;
  font-weight: 800;
  line-height: 1;
}

.suit {
  font-size: 12px;
  opacity: 0.9;
}

.back {
  font-size: 26px;
  font-weight: 700;
  opacity: 0.7;
}

.tag {
  position: absolute;
  font-size: 11px;
  padding: 2px 5px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.45);
}

.tag.color {
  top: 6px;
  left: 6px;
}

.tag.value {
  bottom: 6px;
  right: 6px;
}

.red { background: linear-gradient(160deg, #7a2430, #c94b57); }
.yellow { background: linear-gradient(160deg, #7a5d14, #d2ad3a); color: #1b1404; }
.green { background: linear-gradient(160deg, #1f5a39, #3fad6b); }
.blue { background: linear-gradient(160deg, #1d4578, #3f7fd0); }
.white { background: linear-gradient(160deg, #d7dde6, #f7f8fa); color: #243041; }
.unknown { background: linear-gradient(160deg, #243448, #1a2d45); }
</style>
