import { describe, expect, it } from 'vitest';
import { CARDS, DECK, validateDeck } from '../cards';
import type { CardId, GameState, Unit } from '../types';
import { applyAction, canAttack, createGame, opponent } from './index';
import { chooseBotAction } from './bot';

const custom = (): CardId[] => { const d = [...DECK]; d[d.length - 1] = 'assassin'; return d; };
const end = (state: GameState) => applyAction(state, state.activePlayer, { type: 'END_PHASE' }).state;
const summon = (state: GameState, cardId: CardId, lane: 0 | 1 | 2 = 0) => {
  const id = `fixture-${state.round}-${lane}`;
  state.players[state.activePlayer].hand = [{ id, cardId }];
  const result = applyAction(state, state.activePlayer, { type: 'PLAY_UNIT', cardInstanceId: id, lane });
  expect(result.error).toBeUndefined(); return result.state;
};

describe('deck construction contract', () => {
  it('default and customized decks contain 30 cards with at most three copies', () => {
    expect(Object.keys(CARDS)).toHaveLength(23);
    expect(validateDeck(DECK)).toEqual({ valid: true });
    expect(custom()).toHaveLength(30);
    expect(validateDeck(custom())).toEqual({ valid: true });
  });
  it.each([0, 29, 31, 33])('rejects %i cards', length => {
    expect(validateDeck(Array.from({ length }, (_, i) => DECK[i % DECK.length]!)).valid).toBe(false);
  });
  it('rejects four copies even if deck length is thirty', () => {
    const deck = [...DECK]; deck[deck.length - 1] = 'goblin';
    expect(validateDeck(deck)).toEqual({ valid: false, error: expect.stringContaining('3 copies') });
  });
  it.each(['unknown', '__proto__', 'constructor', 'toString'])('rejects unknown or inherited card key %s', id => {
    const deck = [...DECK]; deck[0] = id as CardId;
    expect(validateDeck(deck).valid).toBe(false);
  });
  it('rejects non-arrays, sparse arrays and non-string cards at runtime', () => {
    for (const value of [null, {}, 'goblin', new Array(30), [null, ...DECK.slice(1)]]) {
      expect(validateDeck(value as CardId[]).valid).toBe(false);
    }
  });
  it('creates reproducible custom decks with correct ownership and without mutation', () => {
    const a = Object.freeze(custom()); const b = Object.freeze([...DECK]);
    const state = createGame(123, [a, b]);
    expect(state).toEqual(createGame(123, [a, b]));
    for (const id of [0, 1] as const) {
      const p = state.players[id]; const cards = [...p.hand, ...p.deck];
      expect(cards.map(c => c.cardId).sort()).toEqual([...(id === 0 ? a : b)].sort());
      expect(cards.every(c => c.id.startsWith(`${id}-`))).toBe(true);
      expect(new Set(cards.map(c => c.id)).size).toBe(30);
    }
    expect(a).toEqual(custom());
  });
  it('engine itself rejects invalid decks for either player', () => {
    expect(() => createGame(2, [[], DECK])).toThrow('30');
    expect(() => createGame(2, [DECK, Array<CardId>(30).fill('mage')])).toThrow('3 copies');
  });
});

describe('fixed mana and immediate turn-end combat', () => {
  it('starts first player at 5/5 and second player at 0/5', () => {
    for (let seed = 0; seed < 10; seed++) {
      const s = createGame(seed);
      expect(s.players[s.firstPlayer].mana).toBe(5);
      expect(s.players[opponent(s.firstPlayer)].mana).toBe(0);
      expect(s.players.map(p => p.maxMana)).toEqual([5, 5]);
    }
  });
  it('refills only the incoming player to exactly 5 through turns 1, 2, 3, 10 and beyond', () => {
    let s = createGame(1);
    while (s.round <= 15) {
      const active = s.activePlayer;
      expect(s.players[active].mana).toBe(5);
      expect(s.players.map(p => p.maxMana)).toEqual([5, 5]);
      // Spend resources without altering combat to verify independent refill.
      s.players[active].mana = 1;
      s = end(s);
      expect(s.players[active].mana).toBe(1);
      expect(s.players[s.activePlayer].mana).toBe(5);
    }
  });
  it('can spend exactly five on a Mage on Turn 1, but cannot attack that turn', () => {
    let s = createGame(1); const first = s.firstPlayer; const second = opponent(first);
    s = summon(s, 'mage');
    expect(s.players[first].mana).toBe(0);
    const result = applyAction(s, first, { type: 'END_PHASE' }); s = result.state;
    expect(s.round).toBe(2); expect(s.players[second].coreHp).toBe(30);
    expect(result.events.some(e => e.type === 'ATTACK')).toBe(false);
    expect(s.players[second].mana).toBe(5);
    // Inactive first-player units must not initiate attacks during the second player's turn.
    s = end(s); expect(s.players[second].coreHp).toBe(30);
    // On Turn 3, first player's veteran Mage now attacks the empty lane's core!
    s = end(s); expect(s.players[second].coreHp).toBe(25);
  });
  it('a newly summoned unit on Turn 2 does NOT attack an empty lane core (Rush targets units only)', () => {
    let s = end(createGame(9)); // Turn 2
    const active = s.activePlayer; const target = opponent(active);
    s = summon(s, 'mage');
    expect(s.players[active].lanes[0]?.summonedRound).toBe(2);
    s = end(s);
    // Core remains undamaged because newly summoned unit cannot hit core on empty lane
    expect(s.players[target].coreHp).toBe(30);
    // Advance past opponent's turn
    s = end(s); // Turn 4, active player's turn again
    // Now Mage is a veteran unit (summoned in round 2 < round 4) -> attacks core!
    s = end(s);
    expect(s.players[target].coreHp).toBe(25);
  });
  it('a newly summoned unit on Turn 2 DOES attack an opposing enemy unit immediately (Rush)', () => {
    let s = end(createGame(9)); // Turn 2
    const active = s.activePlayer; const defender = opponent(active);
    // Place an enemy unit in lane 0
    s.players[defender].lanes[0] = { id: 'enemy-knight', cardId: 'knight', attack: 4, hp: 5, maxHp: 5, summonedRound: 1, statuses: [] };
    // Summon assassin (4 ATK, 2 HP) in lane 0
    s = summon(s, 'assassin');
    expect(s.players[active].lanes[0]?.summonedRound).toBe(2);
    s = end(s);
    // Assassin attacks Knight immediately (Rush)! Knight counterattacks Assassin.
    // Assassin dies (2 HP - 4 = -2 <= 0), Knight takes 4 damage (5 - 4 = 1 HP)
    expect(s.players[active].lanes[0]).toBeNull();
    expect(s.players[defender].lanes[0]?.hp).toBe(1);
    expect(s.players[defender].coreHp).toBe(30); // Core untouched!
  });
  it('a new attacker exchanges simultaneous damage with a frozen defender', () => {
    let s = end(createGame(4)); const active = s.activePlayer; const defender = opponent(active);
    const target: Unit = { id: 'blocker', cardId: 'goblin', attack: 2, hp: 2, maxHp: 2, summonedRound: 1, statuses: [{ type: 'FREEZE', remainingCombatPhases: 1 }] };
    s.players[defender].lanes[0] = target;
    s = summon(s, 'knight'); s = end(s);
    expect(s.players[active].lanes[0]?.hp).toBe(3); expect(s.players[defender].lanes[0]).toBeNull();
    expect(s.players[defender].coreHp).toBe(30);
  });
  it('new frozen and poison-killed units cannot initiate an attack', () => {
    for (const status of ['FREEZE', 'POISON'] as const) {
      let s = summon(end(createGame(4)), 'goblin'); const active = s.activePlayer; const defender = opponent(active);
      s.players[active].lanes[0]!.statuses = [{ type: status, remainingCombatPhases: 1 }];
      s = end(s); expect(s.players[defender].coreHp).toBe(30);
      if (status === 'POISON') expect(s.players[active].lanes[0]).toBeNull();
      else expect(s.players[active].lanes[0]?.statuses).toEqual([]);
    }
    const dead = { hp: 0, statuses: [], summonedRound: 2 } as unknown as Unit;
    expect(canAttack(dead, 2, 'UNIT')).toBe(false);
    expect(canAttack(dead, 2, 'CORE')).toBe(false);
  });
  it('normal bot finds lethal with a veteran unit attacking an open lane', () => {
    const s = end(createGame(2)); const active = s.activePlayer;
    s.players[opponent(active)].coreHp = 5;
    // Veteran unit from round 1 on lane 0
    s.players[active].lanes[0] = { id: 'veteran-mage', cardId: 'mage', attack: 5, hp: 4, maxHp: 4, summonedRound: 1, statuses: [] };
    const action = chooseBotAction(s, active, 'normal');
    // Bot simply ends phase to let veteran unit deliver lethal to core
    const next = applyAction(s, active, action).state;
    expect(end(next).winner).toBe(active);
  });
});
