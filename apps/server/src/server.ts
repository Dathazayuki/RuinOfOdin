import { randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import { existsSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { Server, type Socket } from 'socket.io';
import { z } from 'zod';
import { applyAction, createGame, eventsFor, forfeit, viewFor, type GameEvent, type GameState, type PlayerId, type Reply, type RoomCredentials, type RoomSnapshot, type RoomStatus } from '@core-battle/shared';

const currentDir = typeof __dirname !== 'undefined' ? __dirname : dirname(fileURLToPath(import.meta.url));

const actionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('PLAY_UNIT'), cardInstanceId: z.string().max(80), lane: z.union([z.literal(0), z.literal(1), z.literal(2)]) }),
  z.object({ type: z.literal('CAST_SPELL'), cardInstanceId: z.string().max(80), targetId: z.string().max(80).optional() }),
  z.object({ type: z.literal('END_PHASE') }),
  z.object({ type: z.literal('USE_TACTIC_TOKEN') }),
]);
const credentialsSchema = z.object({ code: z.string().regex(/^[A-Z0-9]{6}$/), token: z.string().length(48) });
interface Seat { token: string; socketId: string | null; deadline: number | null }
interface Room { code: string; status: RoomStatus; seats: [Seat, Seat?]; game: GameState | null; updated: number; reason?: string }
interface Session { code: string; player: PlayerId }
export interface ServerOptions { clientUrl?: string; reconnectMs?: number; cleanupMs?: number; maxRooms?: number; seed?: () => number }

export function createBattleServer(options: ServerOptions = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'core-battle' }));

  // Serve static client bundle if present (Unified single-service deployment)
  const clientDist = [
    resolve(currentDir, '../../client/dist'),
    resolve(process.cwd(), 'apps/client/dist'),
    resolve(currentDir, '../client/dist'),
  ].find(p => existsSync(p));
  if (clientDist) {
    app.use(express.static(clientDist));
    app.use((req, res, next) => {
      if (req.method !== 'GET') return next();
      if (req.path.startsWith('/socket.io') || req.path === '/health') return next();
      res.sendFile(join(clientDist, 'index.html'));
    });
  }

  const http = createServer(app);
  const origins = options.clientUrl ? options.clientUrl.split(',').map(s => s.trim()) : null;
  const io = new Server(http, {
    cors: { origin: origins ?? true, credentials: true },
    maxHttpBufferSize: 8192,
    allowRequest: (req, callback) => {
      if (!origins) return callback(null, true);
      const origin = req.headers.origin;
      callback(null, !origin || origins.includes(origin));
    },
  });
  const rooms = new Map<string, Room>();
  const sessions = new Map<string, Session>();
  const reconnectMs = options.reconnectMs ?? 30000;
  const newSeat = (socket: Socket): Seat => ({ token: randomBytes(24).toString('hex'), socketId: socket.id, deadline: null });
  const snapshot = (room: Room, player: PlayerId, events: GameEvent[] = []): RoomSnapshot => ({
    code: room.code, status: room.status, you: player, game: room.game ? viewFor(room.game, player) : null,
    events: eventsFor(events, player), reconnectDeadline: room.seats.reduce<number | null>((deadline, seat) => seat?.deadline ? Math.min(deadline ?? Infinity, seat.deadline) : deadline, null), reason: room.reason,
  });
  const broadcast = (room: Room, events: GameEvent[] = []) => {
    room.updated = Date.now();
    room.seats.forEach((seat, player) => { if (seat?.socketId) io.to(seat.socketId).emit('ROOM_STATE', snapshot(room, player as PlayerId, events)); });
  };
  const sessionRoom = (socket: Socket) => {
    const session = sessions.get(socket.id);
    const room = session ? rooms.get(session.code) : undefined;
    if (!session || !room || room.seats[session.player]?.socketId !== socket.id) throw new Error('Join a room first.');
    return { room, player: session.player };
  };
  const finishForfeit = (room: Room, player: PlayerId, reason: string) => {
    if (!room.game || room.game.phase === 'FINISHED') return;
    const result = forfeit(room.game, player); room.game = result.state; room.status = 'FINISHED'; room.reason = reason;
    for (const seat of room.seats) if (seat) seat.deadline = null;
    broadcast(room, result.events);
  };
  const detach = (socket: Socket, intentional: boolean) => {
    const session = sessions.get(socket.id);
    if (!session) return;
    const room = rooms.get(session.code); sessions.delete(socket.id);
    if (!room) return;
    const seat = room.seats[session.player];
    if (!seat || seat.socketId !== socket.id) return;
    seat.socketId = null;
    if (intentional) {
      if (room.game?.phase === 'ACTION') finishForfeit(room, session.player, 'Opponent left the match.');
      else if (!room.game) room.status = 'CLOSED';
      seat.token = ''; // An explicit leave revokes its resume credential.
    } else if (room.status !== 'FINISHED' && room.status !== 'CLOSED') {
      seat.deadline = Date.now() + reconnectMs; room.status = 'DISCONNECTED';
    }
    broadcast(room);
  };
  const timer = setInterval(() => {
    const now = Date.now();
    for (const room of rooms.values()) {
      if (room.status === 'DISCONNECTED') {
        const expired = room.seats.findIndex(s => s?.deadline !== null && s?.deadline !== undefined && s.deadline <= now);
        if (expired >= 0) {
          if (room.game) finishForfeit(room, expired as PlayerId, 'Opponent did not reconnect in time.');
          else { room.status = 'CLOSED'; broadcast(room); }
        }
      }
      // In-memory MVP rooms have bounded lifetimes; connected matches are not evicted.
      const empty = room.seats.every(s => !s?.socketId);
      if ((empty && now - room.updated > 60000) || (['WAITING', 'FINISHED', 'CLOSED'].includes(room.status) && now - room.updated > 30 * 60 * 1000)) {
        room.status = 'CLOSED'; broadcast(room);
        for (const seat of room.seats) if (seat?.socketId) sessions.delete(seat.socketId);
        rooms.delete(room.code);
      }
    }
  }, options.cleanupMs ?? 1000);
  timer.unref();

  io.on('connection', socket => {
    console.log(`[Socket] client connected: ${socket.id}`);
    socket.on('disconnect', reason => console.log(`[Socket] client ${socket.id} disconnected: ${reason}`));
    let requestCount = 0; let windowStart = Date.now();
    const handle = <T>(event: string, fn: (payload: unknown) => T) => {
      socket.on(event, (...args: unknown[]) => {
        console.log(`[Socket] received ${event} from ${socket.id}`);
        const ack = typeof args[args.length - 1] === 'function' ? (args[args.length - 1] as (result: Reply<T>) => void) : null;
        if (!ack) {
          console.warn(`[Socket] no ack callback provided for ${event}`);
          return;
        }
        const payload = args.length > 1 ? args[0] : undefined;
        try {
          if (Date.now() - windowStart >= 1000) { requestCount = 0; windowStart = Date.now(); }
          if (++requestCount > 30) throw new Error('Too many requests. Please wait a moment.');
          const data = fn(payload);
          console.log(`[Socket] ${event} success for ${socket.id}`);
          ack({ ok: true, data });
        } catch (error) {
          const msg = error instanceof z.ZodError ? 'Invalid request.' : error instanceof Error ? error.message : 'Request rejected.';
          console.error(`[Socket] ${event} error for ${socket.id}: ${msg}`);
          ack({ ok: false, error: msg });
        }
      });
    };
    handle<RoomCredentials>('CREATE_ROOM', () => {
      if (sessions.has(socket.id)) throw new Error('Leave your current room first.');
      if (rooms.size >= (options.maxRooms ?? 1000)) throw new Error('Server is full. Try again later.');
      let code: string; do { code = randomBytes(3).toString('hex').toUpperCase(); } while (rooms.has(code));
      const seat = newSeat(socket);
      const room: Room = { code, status: 'WAITING', seats: [seat], game: null, updated: Date.now() };
      rooms.set(code, room); sessions.set(socket.id, { code, player: 0 }); broadcast(room);
      return { code, token: seat.token, player: 0 };
    });
    handle<RoomCredentials>('JOIN_ROOM', payload => {
      if (sessions.has(socket.id)) throw new Error('Leave your current room first.');
      const { code } = z.object({ code: z.string().regex(/^[A-Z0-9]{6}$/) }).parse(payload);
      const room = rooms.get(code);
      if (!room || room.status === 'CLOSED') throw new Error('Room not found.');
      if (room.seats[1]) throw new Error('Room is full.');
      if (room.status !== 'WAITING') throw new Error('The host is disconnected. Try again shortly.');
      const seat = newSeat(socket); room.seats[1] = seat;
      room.game = createGame(options.seed?.() ?? randomInt(0, 0xffffffff)); room.status = 'PLAYING';
      sessions.set(socket.id, { code, player: 1 }); broadcast(room);
      return { code, token: seat.token, player: 1 };
    });
    handle<RoomCredentials>('RESUME_ROOM', payload => {
      const { code, token } = credentialsSchema.parse(payload);
      const room = rooms.get(code);
      if (!room || room.status === 'CLOSED') throw new Error('This room has expired.');
      const player = room.seats.findIndex(s => s?.token.length === token.length && timingSafeEqual(Buffer.from(s.token), Buffer.from(token))) as PlayerId | -1;
      if (player === -1) throw new Error('Invalid reconnect token.');
      const seat = room.seats[player]!;
      if (seat.deadline !== null && seat.deadline <= Date.now()) {
        if (room.game) finishForfeit(room, player, 'Reconnect timeout.');
        else { room.status = 'CLOSED'; throw new Error('This room has expired.'); }
      }
      const existing = sessions.get(socket.id);
      if (existing && (existing.code !== code || existing.player !== player)) throw new Error('Leave your current room first.');
      if (seat.socketId && seat.socketId !== socket.id) {
        const old = io.sockets.sockets.get(seat.socketId); sessions.delete(seat.socketId); old?.disconnect(true);
      }
      seat.socketId = socket.id; seat.deadline = null; sessions.set(socket.id, { code, player });
      room.status = room.game?.phase === 'FINISHED' ? 'FINISHED' : room.seats.some(s => s && !s.socketId) ? 'DISCONNECTED' : room.game ? 'PLAYING' : 'WAITING';
      broadcast(room); return { code, token: seat.token, player };
    });
    handle('GAME_ACTION', payload => {
      const { room, player } = sessionRoom(socket);
      if (room.status !== 'PLAYING' || !room.game) throw new Error('The match is not ready for actions.');
      const request = z.object({ revision: z.number().int().nonnegative(), action: actionSchema }).parse(payload);
      if (request.revision !== room.game.revision) { broadcast(room); throw new Error('State changed. Please try again.'); }
      // Unknown damage/mana/ownership fields are stripped. Actor comes from session.
      const result = applyAction(room.game, player, request.action);
      if (result.error) throw new Error(result.error);
      room.game = result.state; if (room.game.phase === 'FINISHED') room.status = 'FINISHED';
      broadcast(room, result.events); return undefined;
    });
    handle('FORFEIT', () => { const { room, player } = sessionRoom(socket); finishForfeit(room, player, 'Opponent conceded.'); return undefined; });
    handle('LEAVE_ROOM', () => { detach(socket, true); return undefined; });
    socket.on('disconnect', () => detach(socket, false));
  });
  return { app, http, io, close: async () => { clearInterval(timer); await new Promise<void>(resolve => io.close(() => resolve())); } };
}
