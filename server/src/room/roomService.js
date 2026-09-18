import { randomBytes } from 'node:crypto';
import { v4 as uuidv4 } from 'uuid';
import {
  discardCard,
  giveHint,
  playCard,
  startGame,
  viewGameForPlayer,
} from '../game/engine.js';
import { loadRoom, saveRoom } from '../store/fileStore.js';

const rooms = new Map();

function generateRoomCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  const bytes = randomBytes(6);
  for (let i = 0; i < 6; i += 1) {
    code += alphabet[bytes[i] % alphabet.length];
  }
  return code;
}

async function persist(room) {
  rooms.set(room.roomCode, room);
  await saveRoom(room);
  return room;
}

export async function getRoom(roomCode) {
  const code = String(roomCode || '').toUpperCase();
  if (rooms.has(code)) return rooms.get(code);
  const fromDisk = await loadRoom(code);
  if (fromDisk) {
    rooms.set(code, fromDisk);
    return fromDisk;
  }
  return null;
}

export async function createRoom({ playerId, name }) {
  if (!name || !String(name).trim()) throw new Error('请输入昵称');
  const pid = playerId || uuidv4();
  let roomCode = generateRoomCode();
  // 极低概率碰撞时重试
  for (let i = 0; i < 5; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    if (!(await getRoom(roomCode))) break;
    roomCode = generateRoomCode();
  }

  const room = {
    roomCode,
    status: 'waiting',
    hostPlayerId: pid,
    players: [
      {
        id: pid,
        name: String(name).trim().slice(0, 12),
        ready: true,
        connected: true,
      },
    ],
    game: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  await persist(room);
  return { room, playerId: pid };
}

export async function joinRoom({ roomCode, playerId, name }) {
  const room = await getRoom(roomCode);
  if (!room) throw new Error('房间不存在');
  if (!name || !String(name).trim()) throw new Error('请输入昵称');
  if (room.status === 'finished') throw new Error('对局已结束');

  const pid = playerId || uuidv4();
  const existing = room.players.find((p) => p.id === pid);
  if (existing) {
    existing.name = String(name).trim().slice(0, 12);
    existing.connected = true;
    room.updatedAt = Date.now();
    await persist(room);
    return { room, playerId: pid };
  }

  if (room.status === 'playing') {
    throw new Error('对局已开始，无法加入新玩家');
  }
  if (room.players.length >= 5) throw new Error('房间已满（最多 5 人）');

  room.players.push({
    id: pid,
    name: String(name).trim().slice(0, 12),
    ready: false,
    connected: true,
  });
  room.updatedAt = Date.now();
  await persist(room);
  return { room, playerId: pid };
}

export async function setReady({ roomCode, playerId, ready }) {
  const room = await getRoom(roomCode);
  if (!room) throw new Error('房间不存在');
  if (room.status !== 'waiting') throw new Error('对局已开始');
  const player = room.players.find((p) => p.id === playerId);
  if (!player) throw new Error('你不在此房间');
  player.ready = Boolean(ready);
  room.updatedAt = Date.now();
  await persist(room);
  return room;
}

export async function startRoomGame({ roomCode, playerId }) {
  const room = await getRoom(roomCode);
  if (!room) throw new Error('房间不存在');
  if (room.hostPlayerId !== playerId) throw new Error('只有房主可以开始');
  if (room.status !== 'waiting') throw new Error('对局已开始');
  if (room.players.length < 2) throw new Error('至少需要 2 名玩家');
  if (room.players.length > 5) throw new Error('最多 5 名玩家');
  if (!room.players.every((p) => p.ready)) throw new Error('还有玩家未准备');

  room.game = startGame(room.players.map((p) => ({ id: p.id, name: p.name })));
  room.status = 'playing';
  room.updatedAt = Date.now();
  await persist(room);
  return room;
}

export async function rematch({ roomCode, playerId }) {
  const room = await getRoom(roomCode);
  if (!room) throw new Error('房间不存在');
  if (room.hostPlayerId !== playerId) throw new Error('只有房主可以再来一局');
  if (room.players.length < 2) throw new Error('至少需要 2 名玩家');

  room.game = startGame(room.players.map((p) => ({ id: p.id, name: p.name })));
  room.status = 'playing';
  room.players = room.players.map((p) => ({ ...p, ready: true }));
  room.updatedAt = Date.now();
  await persist(room);
  return room;
}

async function mutateGame(roomCode, playerId, mutator) {
  const room = await getRoom(roomCode);
  if (!room) throw new Error('房间不存在');
  if (room.status !== 'playing' || !room.game) throw new Error('对局未开始');
  if (!room.players.some((p) => p.id === playerId)) throw new Error('你不在此房间');

  const currentId = room.game.playerOrder[room.game.turnIndex];
  const currentPlayer = room.players.find((p) => p.id === currentId);
  if (currentPlayer && !currentPlayer.connected && currentId !== playerId) {
    throw new Error('当前行动玩家已断线，请等待其重连（不代打、不跳过）');
  }

  mutator(room.game, playerId);

  if (room.game.result) {
    room.status = 'finished';
  }
  room.updatedAt = Date.now();
  await persist(room);
  return room;
}

export async function actionHint(roomCode, playerId, payload) {
  return mutateGame(roomCode, playerId, (game, actorId) => {
    giveHint(game, actorId, payload);
  });
}

export async function actionDiscard(roomCode, playerId, payload) {
  return mutateGame(roomCode, playerId, (game, actorId) => {
    discardCard(game, actorId, payload);
  });
}

export async function actionPlay(roomCode, playerId, payload) {
  return mutateGame(roomCode, playerId, (game, actorId) => {
    playCard(game, actorId, payload);
  });
}

export async function setConnected(roomCode, playerId, connected) {
  const room = await getRoom(roomCode);
  if (!room) return null;
  const player = room.players.find((p) => p.id === playerId);
  if (!player) return room;
  player.connected = Boolean(connected);
  room.updatedAt = Date.now();
  await persist(room);
  return room;
}

export function publicRoomView(room, viewerId) {
  if (!room) return null;
  return {
    roomCode: room.roomCode,
    status: room.status,
    hostPlayerId: room.hostPlayerId,
    players: room.players.map((p) => ({
      id: p.id,
      name: p.name,
      ready: p.ready,
      connected: p.connected,
    })),
    game: viewGameForPlayer(room.game, viewerId),
    updatedAt: room.updatedAt,
  };
}
