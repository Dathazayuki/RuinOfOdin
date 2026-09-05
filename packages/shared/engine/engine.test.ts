import { describe, expect, it } from 'vitest';
import { CARDS, DECK, coreArt } from '../cards';
import type { CardId, GameAction, GameState, Lane, PlayerId, Unit } from '../types';
import { applyAction, createGame, eventsFor, forfeit, legalActions, opponent, viewFor } from './index';
import { chooseBotAction } from './bot';
import { seededRandom, shuffle } from './random';

function setup(): GameState {
  const s = createGame(42); s.firstPlayer = 0; s.activePlayer = 0; s.round = 5;
  for (const p of s.players) { p.mana = 10; p.maxMana = 5; p.hand = []; }
  return s;
}
function unit(s: GameState, p: PlayerId, lane: Lane, cardId: CardId, extra: Partial<Unit> = {}): Unit {
  const c = CARDS[cardId];
  const u: Unit = { id: `unit-${p}-${lane}`, cardId, hp: c.hp, maxHp: c.hp, attack: c.attack, summonedRound: 1, statuses: [], ...extra };
  s.players[p].lanes[lane] = u; return u;
}
function play(s: GameState, cardId: CardId, targetId?: string, lane: Lane = 0) {
  s.players[s.activePlayer].hand.push({ id: 'test-card', cardId });
  const a: GameAction = CARDS[cardId].type === 'UNIT' ? { type: 'PLAY_UNIT', cardInstanceId: 'test-card', lane } : { type: 'CAST_SPELL', cardInstanceId: 'test-card', targetId };
  return applyAction(s, s.activePlayer, a);
}
function endTurn(s: GameState) {
  return applyAction(s, s.activePlayer, { type: 'END_PHASE' });
}

describe('initialization and resources', () => {
  it('TC-001/010/020 exact deck and starting resources', () => {
    const s = createGame(1);
    expect(DECK).toHaveLength(30);
    expect(DECK.filter(c => CARDS[c].type === 'UNIT')).toHaveLength(15);
    expect(DECK.filter(c => CARDS[c].type === 'SPELL')).toHaveLength(15);
    const first = s.firstPlayer; const second = opponent(first);
    expect(s.players[first].coreHp).toBe(30);
    expect(s.players[second].coreHp).toBe(30);
    expect(s.players[first].hand).toHaveLength(5); // 4 initial + 1 drawn at Turn 1 start
    expect(s.players[first].deck).toHaveLength(25);
    expect(s.players[second].hand).toHaveLength(4);
    expect(s.players[second].deck).toHaveLength(26);
    expect(s.players[first].mana).toBe(1);
    expect(s.players[first].maxMana).toBe(1);
    expect(s.round).toBe(1);
    expect(s.players[0].tacticToken).toBe(false);
    expect(s.players[1].tacticToken).toBe(false);
  });
  it('TC-002 seeded randomness reproduces games and selects both starters', () => {
    expect(createGame(91)).toEqual(createGame(91));
    expect(new Set(Array.from({ length: 50 }, (_, seed) => createGame(seed).firstPlayer)).size).toBe(2);
    expect(shuffle(DECK, seededRandom(9)).sort()).toEqual([...DECK].sort());
  });
  it('TC-011/012/013/130 sequential turns, mana progression and capped mana', () => {
    let s = createGame(3); const first = s.firstPlayer; const second = opponent(first);
    expect(s.round).toBe(1); expect(s.activePlayer).toBe(first); expect(s.players[first].mana).toBe(1);
    s = endTurn(s).state;
    expect(s.round).toBe(2); expect(s.activePlayer).toBe(second); expect(s.players[second].mana).toBe(2);
    s = endTurn(s).state;
    expect(s.round).toBe(3); expect(s.activePlayer).toBe(first); expect(s.players[first].mana).toBe(3);
    while (s.round < 11) s = endTurn(s).state;
    expect(s.round).toBe(11);
    for (const p of s.players) { expect(p.maxMana).toBe(10); }
  });
  it('TC-021 draws every turn, burns overflow, handles empty deck', () => {
    let s = createGame(8); const p0 = s.firstPlayer;
    // Pass turns until hand is full (7 cards)
    while (s.players[p0].hand.length < 7) s = endTurn(s).state;
    expect(s.players[p0].hand).toHaveLength(7);
    // Next draw for p0 should burn to discard
    while (s.activePlayer !== p0) s = endTurn(s).state;
    s = endTurn(s).state; // ends p0 turn, advances to p1
    while (s.activePlayer !== p0) s = endTurn(s).state; // p1 ends, starts p0 turn (draws 8th -> burns)
    expect(s.players[p0].discard.length).toBeGreaterThanOrEqual(1);
    s.players[p0].deck = [];
    while (s.activePlayer !== p0) s = endTurn(s).state;
    s = endTurn(s).state;
    while (s.activePlayer !== p0) s = endTurn(s).state;
    expect(s.players[p0].deck).toHaveLength(0);
  });
  it('tactic token is rejected in sequential mode', () => {
    const s = createGame(8);
    expect(applyAction(s, s.activePlayer, { type: 'USE_TACTIC_TOKEN' }).error).toBeTruthy();
  });
});

describe('placement and combat', () => {
  it('TC-030 places a unit, spends real cost and preserves input', () => {
    const s = setup(); const r = play(s, 'goblin');
    expect(r.state.players[0].lanes[0]?.cardId).toBe('goblin'); expect(r.state.players[0].mana).toBe(9); expect(r.state.players[0].hand).toHaveLength(0);
    expect(s.players[0].mana).toBe(10); expect(s.players[0].lanes[0]).toBeNull();
  });
  it('places assassin, spends 2 mana, attacks for 4 and has 2 HP', () => {
    const s = setup();
    const r = play(s, 'assassin', undefined, 1);
    expect(r.state.players[0].lanes[1]?.cardId).toBe('assassin');
    expect(r.state.players[0].lanes[1]?.attack).toBe(4);
    expect(r.state.players[0].lanes[1]?.hp).toBe(2);
    expect(r.state.players[0].mana).toBe(8);
  });
  it('TC-031/140/182 rejects invalid lane, occupancy, ownership, phase and mana atomically', () => {
    const s = setup(); unit(s, 0, 0, 'knight'); const r = play(s, 'goblin');
    expect(r.error).toBeTruthy(); expect(r.state).toBe(s); expect(r.events).toEqual([]);
    expect(applyAction(s, 1, { type: 'END_PHASE' }).error).toBeTruthy();
    expect(applyAction(s, 0, { type: 'PLAY_UNIT', cardInstanceId: 'stolen', lane: 1 }).error).toBeTruthy();
    s.players[0].mana = 0; expect(play(s, 'mage', undefined, 1).error).toBeTruthy();
    s.players[0].mana = 10; expect(play(s, 'mage', undefined, 9 as Lane).error).toBeTruthy();
  });
  it('TC-040 Turn 1 units cannot attack; units attack on subsequent turns', () => {
    let s = createGame(1); const first = s.firstPlayer; const second = opponent(first);
    // Turn 1: First player summons a goblin (cost 1, starting mana 1)
    s = play(s, 'goblin', undefined, 0).state;
    expect(s.players[first].lanes[0]?.cardId).toBe('goblin');
    expect(s.players[first].lanes[0]?.summonedRound).toBe(1);

    // Turn 1 ends: Auto-combat triggers, but units CANNOT attack on Turn 1!
    s = endTurn(s).state;
    expect(s.round).toBe(2);
    expect(s.players[second].coreHp).toBe(30);

    // Turn 2: Second player ends turn without attacking
    s = endTurn(s).state;
    expect(s.round).toBe(3);
    expect(s.activePlayer).toBe(first);

    // Turn 3: First player ends turn. Goblin was summoned in Turn 1 (< 3), so it attacks open lane!
    s = endTurn(s).state;
    expect(s.players[second].coreHp).toBe(28); // Goblin has 2 ATK: 30 - 2 = 28
  });
  it('TC-050 Knight and Goblin exchange once with no damage spill', () => {
    const s = setup(); unit(s, 0, 0, 'knight'); unit(s, 1, 0, 'goblin'); const r = endTurn(s).state;
    expect(r.players[0].lanes[0]?.hp).toBe(3); expect(r.players[1].lanes[0]).toBeNull(); expect(r.players[1].coreHp).toBe(30);
  });
  it('TC-051/110 open lane damages core', () => {
    const s = setup(); unit(s, 0, 0, 'knight'); expect(endTurn(s).state.players[1].coreHp).toBe(26);
  });
  it('TC-120 both killed units still deal damage', () => {
    const s = setup(); unit(s, 0, 0, 'mage', { hp: 3 }); unit(s, 1, 0, 'mage', { hp: 3 }); const r = endTurn(s).state;
    expect(r.players[0].lanes[0]).toBeNull(); expect(r.players[1].lanes[0]).toBeNull();
  });
  it('defenders counterattack; defender does not attack open lanes unprovoked', () => {
    const s = setup(); unit(s, 0, 0, 'knight'); unit(s, 1, 0, 'archer', { summonedRound: 5, statuses: [{ type: 'FREEZE', remainingCombatPhases: 1 }] });
    unit(s, 1, 1, 'archer', { summonedRound: 1 }); // Player 1 has archer on open lane 1
    const r = endTurn(s).state;
    // Knight took 4 damage from lane 0 archer counterattack (5 HP - 4 = 1)
    expect(r.players[0].lanes[0]?.hp).toBe(1);
    // Player 0 core did NOT take damage from lane 1 archer because Player 1 was defending!
    expect(r.players[0].coreHp).toBe(30);
  });
});

describe('spells and status timing', () => {
  it('Fireball hits any living unit but never a core', () => {
    const s = setup(); const target = unit(s, 1, 0, 'knight'); expect(play(s, 'fireball', target.id).state.players[1].lanes[0]?.hp).toBe(1);
    expect(play(setup(), 'fireball', 'core-1').error).toBeTruthy();
    const friendly = unit(s, 0, 0, 'knight'); expect(play(s, 'fireball', friendly.id).state.players[0].lanes[0]?.hp).toBe(1);
  });
  it('TC-060 poison ticks twice then expires', () => {
    let s = setup(); const target = unit(s, 1, 0, 'knight'); s = play(s, 'poison', target.id).state;
    s = endTurn(s).state; expect(s.players[1].lanes[0]?.hp).toBe(3);
    s = endTurn(s).state; expect(s.players[1].lanes[0]?.hp).toBe(1); expect(s.players[1].lanes[0]?.statuses).toEqual([]);
  });
  it('TC-061 poison removes dead blockers before attacks', () => {
    const s = setup(); unit(s, 0, 0, 'knight'); const target = unit(s, 1, 0, 'goblin'); const r = endTurn(play(s, 'poison', target.id).state);
    expect(r.state.players[0].lanes[0]?.hp).toBe(5); expect(r.state.players[1].coreHp).toBe(26);
    expect(r.events.findIndex(e => e.type === 'UNIT_DIED')).toBeLessThan(r.events.findIndex(e => e.type === 'ATTACK'));
  });
  it('TC-070 freeze prevents one attack and preserves poison', () => {
    let s = setup(); const target = unit(s, 1, 0, 'guardian', { statuses: [{ type: 'POISON', remainingCombatPhases: 2 }] });
    s = play(s, 'freeze', target.id).state; expect(s.players[1].lanes[0]?.statuses).toHaveLength(2);
    // Player 0 ends turn: poison ticks (8 -> 6), freeze stays because target is defender
    s = endTurn(s).state;
    expect(s.players[0].coreHp).toBe(30);
    expect(s.players[1].lanes[0]?.statuses).toEqual([{ type: 'POISON', remainingCombatPhases: 1 }, { type: 'FREEZE', remainingCombatPhases: 1 }]);
    // Player 1 ends turn: poison ticks (6 -> 4, expires), guardian skips attack because of freeze, freeze expires
    s = endTurn(s).state;
    expect(s.players[0].coreHp).toBe(30);
    expect(s.players[1].lanes[0]?.statuses).toEqual([]);
    // Next cycle: Player 0 ends turn
    s = endTurn(s).state;
    // Player 1 ends turn: Guardian attacks Player 0 core! (Guardian has 2 ATK: 30 - 2 = 28)
    s = endTurn(s).state;
    expect(s.players[0].coreHp).toBe(28);
  });
  it('TC-080 heals to max; rejects enemy and dead targets', () => {
    const s = setup(); const target = unit(s, 0, 0, 'guardian', { hp: 5 }); expect(play(s, 'heal', target.id).state.players[0].lanes[0]?.hp).toBe(8);
    const enemy = unit(s, 1, 0, 'knight'); expect(play(s, 'heal', enemy.id).error).toBeTruthy();
    target.hp = 0; expect(play(s, 'heal', target.id).error).toBeTruthy();
  });
  it('TC-090 Lightning applies all damage before deaths', () => {
    const s = setup(); unit(s, 1, 0, 'archer'); unit(s, 1, 1, 'knight'); unit(s, 1, 2, 'goblin'); const r = play(s, 'lightning');
    expect(r.state.players[1].lanes.map(u => u?.hp ?? null)).toEqual([null, 2, null]);
    const types = r.events.map(e => e.type); expect(types.lastIndexOf('DAMAGE_DEALT')).toBeLessThan(types.indexOf('UNIT_DIED'));
  });
  it('TC-100 Mage battlecry kills immediately, never hits core, mage remains sick', () => {
    const s = setup(); unit(s, 1, 0, 'goblin'); const r = play(s, 'mage'); expect(r.state.players[1].lanes[0]).toBeNull();
    expect(endTurn(r.state).state.players[1].coreHp).toBe(30); expect(play(setup(), 'mage').state.players[1].coreHp).toBe(30);
  });
});

describe('endgame, privacy and full matches', () => {
  it('TC-111/112/113 core art follows section 40 thresholds', () => {
    expect(coreArt(20)).toContain('Idle'); expect(coreArt(15)).toContain('Damaged'); expect(coreArt(7)).toContain('Damaged'); expect(coreArt(6)).toContain('Low_Hp'); expect(coreArt(0)).toContain('Destroyed');
  });
  it('TC-150 finished games reject actions', () => {
    const s = setup(); unit(s, 0, 0, 'knight'); s.players[1].coreHp = 4; const r = endTurn(s).state;
    expect(r.phase).toBe('FINISHED'); expect(r.winner).toBe(0); expect(applyAction(r, 0, { type: 'END_PHASE' }).error).toBeTruthy();
  });
  it('simultaneous destruction in sudden death is a draw', () => {
    const s = setup(); s.round = 21; s.players[0].coreHp = 2; s.players[1].coreHp = 2;
    expect(endTurn(s).state.winner).toBe('DRAW');
  });
  it('TC-160 full passing match deterministically ends in sudden-death draw', () => {
    let s = createGame(0);
    while (s.phase === 'ACTION') {
      s = endTurn(s).state;
      if (s.round === 21) {
        // Turn 20 ended, Turn 21 just started (Sudden death combat has not occurred yet)
        expect(s.players[0].coreHp).toBe(30);
      }
      if (s.round === 22) {
        // Turn 21 combat finished: Sudden death dealt 2 damage to both cores
        expect(s.players[0].coreHp).toBe(28);
        expect(s.players[1].coreHp).toBe(28);
      }
      expect(s.round).toBeLessThanOrEqual(50);
    }
    expect(s.winner).toBe('DRAW');
  });
  it('TC-183 views and events conceal opponent hand and all deck orders', () => {
    const s = createGame(9); const v = viewFor(s, 0);
    expect(v.players[1]).not.toHaveProperty('hand'); expect(v.players[0]).not.toHaveProperty('deck'); expect(v.players[1]).not.toHaveProperty('deck'); expect(v).not.toHaveProperty('seed');
    const result = endTurn(s);
    expect(eventsFor(result.events, s.firstPlayer).filter(e => e.type === 'CARD_DRAWN')).toHaveLength(0);
    expect(eventsFor(result.events, opponent(s.firstPlayer)).filter(e => e.type === 'CARD_DRAWN').map(e => e.player)).toEqual([opponent(s.firstPlayer)]);
  });
  it('forfeit awards opponent a win', () => { expect(forfeit(createGame(1), 0).state.winner).toBe(1); });
  it('TC-192 normal bot finds lethal removal', () => {
    const s = setup(); unit(s, 0, 0, 'knight'); const blocker = unit(s, 1, 0, 'goblin'); s.players[1].coreHp = 4;
    s.players[0].hand = [{ id: 'kill', cardId: 'fireball' }];
    expect(chooseBotAction(s, 0, 'normal')).toEqual({ type: 'CAST_SPELL', cardInstanceId: 'kill', targetId: blocker.id });
  });
  it('TC-190/191 easy and normal bots finish whole matches with legal actions', () => {
    for (let seed = 0; seed < 12; seed++) {
      let s = createGame(seed); let count = 0; const random = seededRandom(seed);
      while (s.phase === 'ACTION') {
        const p = s.activePlayer; const a = chooseBotAction(s, p, p === 0 ? 'normal' : 'easy', random);
        expect(legalActions(s, p)).toContainEqual(a);
        const r = applyAction(s, p, a); expect(r.error).toBeUndefined(); s = r.state;
        for (const player of s.players) { expect(player.mana).toBeGreaterThanOrEqual(0); expect(player.hand.length).toBeLessThanOrEqual(7); expect(player.lanes.filter(Boolean).length).toBeLessThanOrEqual(3); }
        expect(++count).toBeLessThan(300);
      }
      expect(s.winner).not.toBeNull();
    }
  });
});
