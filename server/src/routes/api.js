import { Router } from 'express';
import {
  createRoom,
  getRoom,
  joinRoom,
  publicRoomView,
  rematch,
  setReady,
  startRoomGame,
} from '../room/roomService.js';
import { broadcastRoom } from '../ws/hub.js';

const router = Router();

function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

router.post(
  '/rooms',
  asyncHandler(async (req, res) => {
    const { playerId, name } = req.body || {};
    const { room, playerId: pid } = await createRoom({ playerId, name });
    res.json({ playerId: pid, room: publicRoomView(room, pid) });
  }),
);

router.post(
  '/rooms/:code/join',
  asyncHandler(async (req, res) => {
    const { playerId, name } = req.body || {};
    const { room, playerId: pid } = await joinRoom({
      roomCode: req.params.code,
      playerId,
      name,
    });
    await broadcastRoom(room.roomCode);
    res.json({ playerId: pid, room: publicRoomView(room, pid) });
  }),
);

router.get(
  '/rooms/:code',
  asyncHandler(async (req, res) => {
    const room = await getRoom(req.params.code);
    if (!room) {
      res.status(404).json({ message: '房间不存在' });
      return;
    }
    const viewerId = String(req.query.playerId || '');
    res.json({ room: publicRoomView(room, viewerId) });
  }),
);

router.post(
  '/rooms/:code/ready',
  asyncHandler(async (req, res) => {
    const { playerId, ready } = req.body || {};
    const room = await setReady({
      roomCode: req.params.code,
      playerId,
      ready,
    });
    await broadcastRoom(room.roomCode);
    res.json({ room: publicRoomView(room, playerId) });
  }),
);

router.post(
  '/rooms/:code/start',
  asyncHandler(async (req, res) => {
    const { playerId } = req.body || {};
    const room = await startRoomGame({
      roomCode: req.params.code,
      playerId,
    });
    await broadcastRoom(room.roomCode);
    res.json({ room: publicRoomView(room, playerId) });
  }),
);

router.post(
  '/rooms/:code/rematch',
  asyncHandler(async (req, res) => {
    const { playerId } = req.body || {};
    const room = await rematch({
      roomCode: req.params.code,
      playerId,
    });
    await broadcastRoom(room.roomCode);
    res.json({ room: publicRoomView(room, playerId) });
  }),
);

export default router;
