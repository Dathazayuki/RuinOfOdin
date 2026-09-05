import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { io, type Socket } from 'socket.io-client';
import type { AddressInfo } from 'node:net';
import { legalActions, type GameState, type Reply, type RoomCredentials, type RoomSnapshot } from '@core-battle/shared';
import { createBattleServer } from './server';

let server: ReturnType<typeof createBattleServer>;
let url: string;
let sockets: Socket[];
const snapshots = new Map<Socket, RoomSnapshot>();
async function connect(): Promise<Socket> {
  const socket = io(url, { transports: ['websocket'], forceNew: true, reconnection: false });
  sockets.push(socket); socket.on('ROOM_STATE', (state: RoomSnapshot) => snapshots.set(socket, state));
  await new Promise<void>(resolve => socket.once('connect', resolve)); return socket;
}
async function request<T>(socket: Socket, event: string, payload: unknown = {}): Promise<Reply<T>> { return socket.timeout(3000).emitWithAck(event, payload) as Promise<Reply<T>>; }
async function data<T>(socket: Socket, event: string, payload: unknown = {}): Promise<T> {
  const result = await request<T>(socket, event, payload); if (!result.ok) throw new Error(result.error); return result.data;
}
async function match() {
  const a = await connect(); const b = await connect(); const credentials = await data<RoomCredentials>(a, 'CREATE_ROOM');
  const second = await data<RoomCredentials>(b, 'JOIN_ROOM', { code: credentials.code });
  await new Promise(resolve => setTimeout(resolve, 15)); return { a, b, credentials, second };
}
beforeEach(async () => {
  sockets = []; snapshots.clear(); server = createBattleServer({ reconnectMs: 200, cleanupMs: 10, seed: () => 42 });
  await new Promise<void>(resolve => server.http.listen(0, '127.0.0.1', resolve)); url = `http://127.0.0.1:${(server.http.address() as AddressInfo).port}`;
});
afterEach(async () => { for (const socket of sockets) socket.disconnect(); await server.close(); });
describe('authoritative multiplayer', () => {
  it('TC-170/171/172 creates, joins, rejects a third player', async () => {
    const a = await connect(); const credentials = await data<RoomCredentials>(a, 'CREATE_ROOM');
    expect(credentials.code).toMatch(/^[A-Z0-9]{6}$/); expect(snapshots.get(a)?.status).toBe('WAITING');
    const b = await connect(); await data(b, 'JOIN_ROOM', { code: credentials.code });
    expect(snapshots.get(b)?.status).toBe('PLAYING');
    const c = await connect(); expect((await request(c, 'JOIN_ROOM', { code: credentials.code })).ok).toBe(false);
  });
  it('TC-173/180/181 server strips forged stats, binds actor and synchronizes views', async () => {
    const { a, b } = await match(); const state = snapshots.get(a)!.game!;
    const actor = state.activePlayer === 0 ? a : b; const waiting = actor === a ? b : a;
    expect((await request(waiting, 'GAME_ACTION', { revision: 0, action: { type: 'END_PHASE', player: state.activePlayer } })).ok).toBe(false);
    await data(actor, 'GAME_ACTION', { revision: 0, action: { type: 'END_PHASE', mana: 999, damage: 999, coreHp: 999 }, player: state.activePlayer });
    await new Promise(resolve => setTimeout(resolve, 15));
    for (const client of [a, b]) { const view = snapshots.get(client)!.game!; expect(view.revision).toBe(1); expect(view.players[0].coreHp).toBe(30); expect(view.players[view.activePlayer].mana).toBe(2); }
    expect((await request(waiting, 'GAME_ACTION', { revision: 0, action: { type: 'END_PHASE' } })).ok).toBe(false);
  });
  it('TC-182/183 hides private cards/decks, rejects stolen cards and malformed messages', async () => {
    const { a, b } = await match();
    for (const client of [a, b]) {
      const view = snapshots.get(client)!.game!;
      expect(view.players[view.you].hand?.length).toBeGreaterThanOrEqual(4); expect(view.players[view.you === 0 ? 1 : 0]).not.toHaveProperty('hand');
      for (const p of view.players) { expect(p).not.toHaveProperty('deck'); expect(p).not.toHaveProperty('discard'); }
      expect(snapshots.get(client)).not.toHaveProperty('token');
    }
    const state = snapshots.get(a)!.game!; const actor = state.activePlayer === 0 ? a : b;
    expect((await request(actor, 'GAME_ACTION', { revision: 0, action: { type: 'PLAY_UNIT', cardInstanceId: 'not-owned', lane: 0 } })).ok).toBe(false);
    for (const payload of [null, {}, { revision: 0, action: { type: 'PLAY_UNIT', cardInstanceId: 'x', lane: -1 } }]) expect((await request(actor, 'GAME_ACTION', payload)).ok).toBe(false);
  });
  it('draw events are private when a new round starts', async () => {
    const { a, b } = await match(); const first = snapshots.get(a)!.game!.activePlayer;
    await data(first === 0 ? a : b, 'GAME_ACTION', { revision: 0, action: { type: 'END_PHASE' } });
    await new Promise(resolve => setTimeout(resolve, 15));
    const nextPlayer = first === 0 ? 1 : 0;
    const nextClient = nextPlayer === 0 ? a : b;
    const waitingClient = nextPlayer === 0 ? b : a;
    expect(snapshots.get(nextClient)!.events.filter(e => e.type === 'CARD_DRAWN').map(e => e.player)).toEqual([nextPlayer]);
    expect(snapshots.get(waitingClient)!.events.filter(e => e.type === 'CARD_DRAWN')).toHaveLength(0);
  });
  it('disconnect pauses actions; secret token resumes the same revision', async () => {
    const { a, b, credentials } = await match(); a.disconnect();
    await new Promise(resolve => setTimeout(resolve, 30)); expect(snapshots.get(b)?.status).toBe('DISCONNECTED');
    expect((await request(b, 'GAME_ACTION', { revision: 0, action: { type: 'END_PHASE' } })).ok).toBe(false);
    const intruder = await connect(); expect((await request(intruder, 'RESUME_ROOM', { code: credentials.code, token: 'a'.repeat(48) })).ok).toBe(false);
    const resumed = await connect(); await data(resumed, 'RESUME_ROOM', credentials);
    expect(snapshots.get(resumed)?.status).toBe('PLAYING'); expect(snapshots.get(resumed)?.game?.revision).toBe(0);
  });
  it('disconnect timeout awards forfeit; late reconnect sees finished match', async () => {
    const { a, b, credentials } = await match(); a.disconnect();
    await new Promise(resolve => setTimeout(resolve, 280)); expect(snapshots.get(b)?.game?.winner).toBe(1); expect(snapshots.get(b)?.status).toBe('FINISHED');
    const resumed = await connect(); await data(resumed, 'RESUME_ROOM', credentials); expect(snapshots.get(resumed)?.game?.winner).toBe(1);
  });
  it('explicit leave forfeits and invalidates resume token', async () => {
    const { a, b, credentials } = await match(); await data(a, 'LEAVE_ROOM');
    await new Promise(resolve => setTimeout(resolve, 15)); expect(snapshots.get(b)?.game?.winner).toBe(1);
    const resumed = await connect(); expect((await request(resumed, 'RESUME_ROOM', credentials)).ok).toBe(false);
  });
  it('plays a legal unit using its server card cost', async () => {
    const { a, b } = await match();
    // Pass early rounds to ensure the initial units are affordable.
    for (let revision = 0; revision < 8; revision++) {
      const snap = snapshots.get(a)!; const actor = snap.game!.activePlayer === 0 ? a : b;
      await data(actor, 'GAME_ACTION', { revision, action: { type: 'END_PHASE' } });
      await new Promise(resolve => setTimeout(resolve, 5));
    }
    const actor = snapshots.get(a)!.game!.activePlayer === 0 ? a : b;
    const view = snapshots.get(actor)!.game!;
    const state: GameState = { ...view, players: ([0, 1] as const).map(id => { const p = view.players[id]; return ({ ...p, hand: p.hand ?? [], deck: [], discard: [] }); }) as unknown as GameState['players'] };
    const action = legalActions(state, view.you).find(a => a.type === 'PLAY_UNIT')!;
    await data(actor, 'GAME_ACTION', { revision: view.revision, action: { ...action, damage: 999, mana: 999 } });
    const next = snapshots.get(actor)!.game!; expect(next.players[view.you].lanes.some(Boolean)).toBe(true); expect(next.players[view.you].mana).toBeLessThan(view.players[view.you].maxMana);
  });
});
