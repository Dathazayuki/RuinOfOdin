import { create } from 'zustand';
import { io, type Socket } from 'socket.io-client';
import { applyAction, chooseBotAction, createGame, eventsFor, forfeit, legalActions, seededRandom, viewFor, type GameAction, type GameEvent, type GameState, type GameView, type Reply, type RoomCredentials, type RoomSnapshot } from '@core-battle/shared';
import { playSounds, unlockAudio } from './sound';

interface Store {
  mode: 'menu' | 'bot' | 'room'; difficulty: 'easy' | 'normal'; local: GameState | null; view: GameView | null; room: RoomSnapshot | null;
  connected: boolean; busy: boolean; error: string | null; events: GameEvent[]; log: { id: number; event: GameEvent }[]; batch: number; sound: boolean;
  startBot: (difficulty: 'easy' | 'normal') => void; botStep: () => void; act: (action: GameAction) => void;
  createRoom: () => Promise<void>; joinRoom: (code: string) => Promise<void>; leave: () => Promise<void>; concede: () => void;
  toggleSound: () => void; clearError: () => void;
}
const storageKey = 'core-battle-room';
let socket: Socket | null = null;
let eventId = 0;
let random = seededRandom(1);
function credentials(): RoomCredentials | null {
  try { return JSON.parse(sessionStorage.getItem(storageKey) ?? 'null') as RoomCredentials | null; } catch { return null; }
}
function saveCredentials(value: RoomCredentials | null) {
  try { if (value) sessionStorage.setItem(storageKey, JSON.stringify(value)); else sessionStorage.removeItem(storageKey); } catch { /* Private mode can disable storage. */ }
}
function receive(view: GameView | null, events: GameEvent[]) {
  const state = useGame.getState();
  playSounds(events, state.sound, view?.you ?? 0);
  useGame.setState({ view, events, batch: state.batch + 1, log: [...state.log, ...events.map(event => ({ id: eventId++, event }))].slice(-80) });
}
async function request<T>(event: string, payload: unknown): Promise<T> {
  const connection = getSocket();
  const result = await connection.timeout(8000).emitWithAck(event, payload ?? {}) as Reply<T>;
  if (!result.ok) throw new Error(result.error);
  return result.data;
}
function getSocket(): Socket {
  if (socket) return socket;
  const defaultUrl = window.location.port === '5173'
    ? `${window.location.protocol}//${window.location.hostname}:3001`
    : window.location.origin;
  socket = io(import.meta.env.VITE_SERVER_URL || defaultUrl, { autoConnect: false, reconnection: true });
  socket.on('connect', () => {
    useGame.setState({ connected: true, error: null });
    const saved = credentials();
    if (saved) void request<RoomCredentials>('RESUME_ROOM', saved).then(saveCredentials).catch((e: Error) => {
      saveCredentials(null); useGame.setState({ error: e.message, mode: 'menu', room: null, view: null });
    });
  });
  socket.on('disconnect', () => useGame.setState({ connected: false }));
  socket.on('connect_error', () => useGame.setState({ connected: false, error: 'Cannot reach the game server. Check your connection and try again.' }));
  socket.on('ROOM_STATE', (room: RoomSnapshot) => {
    useGame.setState({ mode: 'room', room, local: null }); receive(room.game, room.events);
  });
  return socket;
}
async function connect() {
  const connection = getSocket();
  if (connection.connected) return;
  await new Promise<void>((resolve, reject) => {
    const cleanup = () => { clearTimeout(timer); connection.off('connect', success); connection.off('connect_error', fail); };
    const success = () => { cleanup(); resolve(); };
    const fail = () => { cleanup(); reject(new Error('Cannot reach the game server. Start the server and try again.')); };
    const timer = setTimeout(fail, 8000);
    connection.once('connect', success); connection.once('connect_error', fail); connection.connect();
  });
}
async function roomOperation(event: 'CREATE_ROOM' | 'JOIN_ROOM', payload: unknown) {
  unlockAudio(); useGame.setState({ busy: true, error: null, log: [], events: [] });
  try { await connect(); saveCredentials(await request<RoomCredentials>(event, payload)); }
  catch (e) { useGame.setState({ error: e instanceof Error ? e.message : 'Connection failed.' }); }
  finally { useGame.setState({ busy: false }); }
}

export const useGame = create<Store>((set, get) => ({
  mode: 'menu', difficulty: 'normal', local: null, view: null, room: null, connected: false, busy: false, error: null, events: [], log: [], batch: 0, sound: false,
  startBot: difficulty => {
    unlockAudio();
    const seed = crypto.getRandomValues(new Uint32Array(1))[0]!; random = seededRandom(seed ^ 0xa5a5a5a5);
    const local = createGame(seed);
    set({ mode: 'bot', difficulty, local, view: viewFor(local, 0), room: null, error: null, events: [], log: [], batch: 0, busy: false });
  },
  botStep: () => {
    const { local, mode, difficulty } = get();
    if (mode !== 'bot' || !local || local.phase !== 'ACTION' || local.activePlayer !== 1) return;
    const result = applyAction(local, 1, chooseBotAction(local, 1, difficulty, random));
    set({ local: result.state }); receive(viewFor(result.state, 0), eventsFor(result.events, 0));
  },
  act: action => {
    unlockAudio(); const { local, mode, view, busy } = get();
    if (busy || !view) return;
    set({ error: null });
    if (mode === 'bot' && local) {
      const result = applyAction(local, 0, action);
      if (result.error) { set({ error: result.error }); return; }
      set({ local: result.state }); receive(viewFor(result.state, 0), eventsFor(result.events, 0));
    } else if (mode === 'room') {
      if (!get().connected) { set({ error: 'Reconnecting to the server…' }); return; }
      set({ busy: true });
      void request('GAME_ACTION', { action, revision: view.revision }).catch((e: Error) => set({ error: e.message })).finally(() => set({ busy: false }));
    }
  },
  createRoom: () => roomOperation('CREATE_ROOM', {}), joinRoom: code => roomOperation('JOIN_ROOM', { code: code.trim().toUpperCase() }),
  leave: async () => {
    const { mode } = get();
    if (mode === 'room' && socket?.connected) {
      try { await request('LEAVE_ROOM', {}); } catch { /* Disconnect still invokes the server grace period. */ }
    }
    saveCredentials(null); socket?.disconnect();
    set({ mode: 'menu', local: null, view: null, room: null, events: [], log: [], error: null, busy: false });
  },
  concede: () => {
    const { mode, local } = get();
    if (mode === 'bot' && local) { const result = forfeit(local, 0); set({ local: result.state }); receive(viewFor(result.state, 0), result.events); }
    else void request('FORFEIT', {}).catch((e: Error) => set({ error: e.message }));
  },
  toggleSound: () => { unlockAudio(); set({ sound: !get().sound }); }, clearError: () => set({ error: null }),
}));

/** Reuses engine validation with only visible information; never duplicates rules in React. */
export function availableActions(view: GameView): GameAction[] {
  const state: GameState = { ...view, players: ([0, 1] as const).map(id => { const p = view.players[id]; return ({ coreHp: p.coreHp, mana: p.mana, maxMana: p.maxMana, tacticToken: p.tacticToken, lanes: p.lanes, hand: p.hand ?? [], deck: [], discard: [] }); }) as unknown as GameState['players'] };
  return legalActions(state, view.you);
}
export function restoreRoom() { if (credentials()) { useGame.setState({ mode: 'room' }); getSocket().connect(); } }
