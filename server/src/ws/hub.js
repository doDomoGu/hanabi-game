import { WebSocketServer } from 'ws';
import {
  actionDiscard,
  actionHint,
  actionPlay,
  getRoom,
  publicRoomView,
  setConnected,
} from '../room/roomService.js';

/** roomCode -> Map<playerId, Set<WebSocket>> */
const socketsByRoom = new Map();

function trackSocket(roomCode, playerId, ws) {
  if (!socketsByRoom.has(roomCode)) socketsByRoom.set(roomCode, new Map());
  const byPlayer = socketsByRoom.get(roomCode);
  if (!byPlayer.has(playerId)) byPlayer.set(playerId, new Set());
  byPlayer.get(playerId).add(ws);
}

function untrackSocket(roomCode, playerId, ws) {
  const byPlayer = socketsByRoom.get(roomCode);
  if (!byPlayer) return;
  const set = byPlayer.get(playerId);
  if (!set) return;
  set.delete(ws);
  if (set.size === 0) byPlayer.delete(playerId);
  if (byPlayer.size === 0) socketsByRoom.delete(roomCode);
}

function send(ws, type, payload) {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify({ type, payload }));
  }
}

export async function broadcastRoom(roomCode) {
  const room = await getRoom(roomCode);
  if (!room) return;
  const byPlayer = socketsByRoom.get(roomCode);
  if (!byPlayer) return;

  for (const [playerId, set] of byPlayer.entries()) {
    const view = publicRoomView(room, playerId);
    for (const ws of set) {
      send(ws, 'room:update', view);
    }
  }
}

export function attachWebSocket(server) {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws) => {
    /** @type {{ roomCode?: string, playerId?: string }} */
    const ctx = {};

    ws.on('message', async (raw) => {
      let msg;
      try {
        msg = JSON.parse(String(raw));
      } catch {
        send(ws, 'error', { message: '无效消息' });
        return;
      }

      const { type, payload = {} } = msg;
      try {
        if (type === 'room:join') {
          const roomCode = String(payload.roomCode || '').toUpperCase();
          const playerId = String(payload.playerId || '');
          if (!roomCode || !playerId) throw new Error('缺少房间或玩家信息');

          const room = await getRoom(roomCode);
          if (!room) throw new Error('房间不存在');
          if (!room.players.some((p) => p.id === playerId)) {
            throw new Error('你不在此房间，请先通过接口加入');
          }

          if (ctx.roomCode && ctx.playerId) {
            untrackSocket(ctx.roomCode, ctx.playerId, ws);
          }

          ctx.roomCode = roomCode;
          ctx.playerId = playerId;
          trackSocket(roomCode, playerId, ws);
          await setConnected(roomCode, playerId, true);
          await broadcastRoom(roomCode);
          return;
        }

        if (!ctx.roomCode || !ctx.playerId) {
          throw new Error('请先加入房间频道');
        }

        if (type === 'ping') {
          send(ws, 'pong', { t: Date.now() });
          return;
        }

        if (type === 'action:hint') {
          await actionHint(ctx.roomCode, ctx.playerId, payload);
          await broadcastRoom(ctx.roomCode);
          return;
        }
        if (type === 'action:discard') {
          await actionDiscard(ctx.roomCode, ctx.playerId, payload);
          await broadcastRoom(ctx.roomCode);
          return;
        }
        if (type === 'action:play') {
          await actionPlay(ctx.roomCode, ctx.playerId, payload);
          await broadcastRoom(ctx.roomCode);
          return;
        }

        throw new Error(`未知消息类型: ${type}`);
      } catch (err) {
        send(ws, 'error', { message: err.message || '操作失败' });
      }
    });

    ws.on('close', async () => {
      if (!ctx.roomCode || !ctx.playerId) return;
      untrackSocket(ctx.roomCode, ctx.playerId, ws);
      const byPlayer = socketsByRoom.get(ctx.roomCode);
      const stillOnline = byPlayer?.get(ctx.playerId)?.size > 0;
      if (!stillOnline) {
        await setConnected(ctx.roomCode, ctx.playerId, false);
        await broadcastRoom(ctx.roomCode);
      }
    });
  });

  return wss;
}
