import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cors from 'cors';
import express from 'express';
import apiRouter from './routes/api.js';
import { attachWebSocket } from './ws/hub.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3001);
const CLIENT_DIST = path.resolve(__dirname, '../../client/dist');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, name: 'hanabi-game' });
});

app.use('/api', apiRouter);

app.use((err, _req, res, _next) => {
  const status = err.status || 400;
  res.status(status).json({ message: err.message || '请求失败' });
});

app.use(express.static(CLIENT_DIST));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/ws')) {
    next();
    return;
  }
  res.sendFile(path.join(CLIENT_DIST, 'index.html'), (err) => {
    if (err) next();
  });
});

const server = http.createServer(app);
attachWebSocket(server);

server.listen(PORT, () => {
  console.log(`[hanabi] server http://localhost:${PORT}`);
  console.log(`[hanabi] websocket ws://localhost:${PORT}/ws`);
});
