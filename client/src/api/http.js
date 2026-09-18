const PLAYER_KEY = 'hanabi.playerId';
const NAME_KEY = 'hanabi.playerName';
const API_BASE = import.meta.env.VITE_API_BASE || '/api';

function createPlayerId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  if (globalThis.crypto?.getRandomValues) {
    const bytes = new Uint8Array(16);
    globalThis.crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  return `player-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

export function getStoredPlayerId() {
  let id = localStorage.getItem(PLAYER_KEY);
  if (!id) {
    id = createPlayerId();
    localStorage.setItem(PLAYER_KEY, id);
  }
  return id;
}

export function getStoredName() {
  return localStorage.getItem(NAME_KEY) || '';
}

export function setStoredName(name) {
  localStorage.setItem(NAME_KEY, name);
}

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || '请求失败');
  }
  return data;
}

export function createRoomApi(name) {
  return request('/rooms', {
    method: 'POST',
    body: JSON.stringify({ playerId: getStoredPlayerId(), name }),
  });
}

export function joinRoomApi(code, name) {
  return request(`/rooms/${encodeURIComponent(code)}/join`, {
    method: 'POST',
    body: JSON.stringify({ playerId: getStoredPlayerId(), name }),
  });
}

export function fetchRoomApi(code) {
  const playerId = getStoredPlayerId();
  return request(`/rooms/${encodeURIComponent(code)}?playerId=${encodeURIComponent(playerId)}`);
}

export function setReadyApi(code, ready) {
  return request(`/rooms/${encodeURIComponent(code)}/ready`, {
    method: 'POST',
    body: JSON.stringify({ playerId: getStoredPlayerId(), ready }),
  });
}

export function startGameApi(code) {
  return request(`/rooms/${encodeURIComponent(code)}/start`, {
    method: 'POST',
    body: JSON.stringify({ playerId: getStoredPlayerId() }),
  });
}

export function rematchApi(code) {
  return request(`/rooms/${encodeURIComponent(code)}/rematch`, {
    method: 'POST',
    body: JSON.stringify({ playerId: getStoredPlayerId() }),
  });
}
