import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import {
  createRoomApi,
  fetchRoomApi,
  getStoredName,
  getStoredPlayerId,
  joinRoomApi,
  rematchApi,
  setReadyApi,
  setStoredName,
  startGameApi,
} from '../api/http';
import { createRoomSocket } from '../api/ws';

export const useRoomStore = defineStore('room', () => {
  const playerId = ref(getStoredPlayerId());
  const playerName = ref(getStoredName());
  const room = ref(null);
  const error = ref('');
  const loading = ref(false);
  let socket = null;

  const roomCode = computed(() => room.value?.roomCode || '');
  const isHost = computed(() => room.value?.hostPlayerId === playerId.value);
  const me = computed(() => room.value?.players?.find((p) => p.id === playerId.value));
  const isMyTurn = computed(
    () => room.value?.game && room.value.game.currentPlayerId === playerId.value,
  );
  const waitingReconnect = computed(() => {
    const g = room.value?.game;
    if (!g || g.result) return false;
    const current = room.value.players.find((p) => p.id === g.currentPlayerId);
    return Boolean(current && !current.connected);
  });

  function setRoom(next) {
    room.value = next;
  }

  function ensureSocket() {
    if (socket) return socket;
    socket = createRoomSocket({
      onUpdate: (view) => {
        setRoom(view);
        error.value = '';
      },
      onError: (message) => {
        error.value = message;
      },
    });
    return socket;
  }

  function connectSocket() {
    if (!room.value) return;
    const s = ensureSocket();
    s.join(room.value.roomCode, playerId.value);
  }

  function disconnectSocket() {
    socket?.close();
    socket = null;
  }

  async function createRoom(name) {
    loading.value = true;
    error.value = '';
    try {
      setStoredName(name);
      playerName.value = name;
      const data = await createRoomApi(name);
      playerId.value = data.playerId;
      setRoom(data.room);
      connectSocket();
      return data.room;
    } catch (e) {
      error.value = e.message;
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function joinRoom(code, name) {
    loading.value = true;
    error.value = '';
    try {
      setStoredName(name);
      playerName.value = name;
      const data = await joinRoomApi(code, name);
      playerId.value = data.playerId;
      setRoom(data.room);
      connectSocket();
      return data.room;
    } catch (e) {
      error.value = e.message;
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function refreshRoom(code) {
    const data = await fetchRoomApi(code);
    setRoom(data.room);
    connectSocket();
    return data.room;
  }

  async function toggleReady() {
    if (!room.value || !me.value) return;
    const data = await setReadyApi(room.value.roomCode, !me.value.ready);
    setRoom(data.room);
  }

  async function startGame() {
    if (!room.value) return;
    const data = await startGameApi(room.value.roomCode);
    setRoom(data.room);
  }

  async function rematch() {
    if (!room.value) return;
    const data = await rematchApi(room.value.roomCode);
    setRoom(data.room);
  }

  function hint(payload) {
    ensureSocket().hint(payload);
  }

  function discard(payload) {
    ensureSocket().discard(payload);
  }

  function play(payload) {
    ensureSocket().play(payload);
  }

  return {
    playerId,
    playerName,
    room,
    error,
    loading,
    roomCode,
    isHost,
    me,
    isMyTurn,
    waitingReconnect,
    createRoom,
    joinRoom,
    refreshRoom,
    toggleReady,
    startGame,
    rematch,
    hint,
    discard,
    play,
    disconnectSocket,
    setError: (msg) => {
      error.value = msg;
    },
  };
});
