export function createRoomSocket({ onUpdate, onError }) {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  const wsPath = import.meta.env.VITE_WS_PATH || '/ws';
  const url = `${proto}://${location.host}${wsPath}`;
  let ws = null;
  let closedByUser = false;
  let pingTimer = null;
  let reconnectTimer = null;
  let roomCode = null;
  let playerId = null;

  function clearTimers() {
    if (pingTimer) clearInterval(pingTimer);
    if (reconnectTimer) clearTimeout(reconnectTimer);
    pingTimer = null;
    reconnectTimer = null;
  }

  function connect() {
    ws = new WebSocket(url);

    ws.addEventListener('open', () => {
      if (roomCode && playerId) {
        send('room:join', { roomCode, playerId });
      }
      pingTimer = setInterval(() => send('ping', {}), 20000);
    });

    ws.addEventListener('message', (ev) => {
      let msg;
      try {
        msg = JSON.parse(ev.data);
      } catch {
        return;
      }
      if (msg.type === 'room:update') onUpdate?.(msg.payload);
      if (msg.type === 'error') onError?.(msg.payload?.message || '出错了');
    });

    ws.addEventListener('close', () => {
      clearTimers();
      if (!closedByUser) {
        reconnectTimer = setTimeout(connect, 1200);
      }
    });
  }

  function send(type, payload) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type, payload }));
    }
  }

  connect();

  return {
    join(code, pid) {
      roomCode = code;
      playerId = pid;
      send('room:join', { roomCode: code, playerId: pid });
    },
    hint(payload) {
      send('action:hint', payload);
    },
    discard(payload) {
      send('action:discard', payload);
    },
    play(payload) {
      send('action:play', payload);
    },
    close() {
      closedByUser = true;
      clearTimers();
      ws?.close();
    },
  };
}
