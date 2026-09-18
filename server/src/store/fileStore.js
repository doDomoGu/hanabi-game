import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const DATA_DIR = path.resolve(__dirname, '../../data/rooms');

async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

function roomPath(roomCode) {
  return path.join(DATA_DIR, `${roomCode}.json`);
}

export async function saveRoom(room) {
  await ensureDir();
  const file = roomPath(room.roomCode);
  const tmp = `${file}.${process.pid}.tmp`;
  const payload = JSON.stringify(room, null, 2);
  await fs.writeFile(tmp, payload, 'utf8');
  await fs.rename(tmp, file);
}

export async function loadRoom(roomCode) {
  try {
    const raw = await fs.readFile(roomPath(roomCode), 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    if (err && err.code === 'ENOENT') return null;
    throw err;
  }
}

export async function deleteRoom(roomCode) {
  try {
    await fs.unlink(roomPath(roomCode));
  } catch (err) {
    if (err && err.code !== 'ENOENT') throw err;
  }
}
