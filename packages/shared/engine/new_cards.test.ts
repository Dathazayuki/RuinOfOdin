import { describe, expect, it } from 'vitest';
import type { CardId, GameState, Lane, PlayerId, Unit } from '../types';
import { CARDS, DECK, validateDeck } from '../cards';
import { applyBattlecry, handleDeathEffects } from './effects';
import { applyAction, canAttack, createGame, opponent } from './index';

const end = (state: GameState) => applyAction(state, state.activePlayer, { type: 'END_PHASE' }).state;

describe('12 New Cards & Abilities', () => {
  it('Berserker revives once upon fatal damage with 1 HP, then dies on second lethal damage', () => {
    const s = createGame(1);
    s.round = 2; // Can attack
    const active = s.activePlayer;
    const def = opponent(active);

    // Place Berserker on active player's lane 0
    s.players[active].lanes[0] = {
      id: 'berserker-1',
      cardId: 'berserker',
      attack: 5,
      hp: 1,
      maxHp: 1,
      summonedRound: 1,
      statuses: [],
    };

    // Place Knight (4 ATK, 5 HP) on opponent's lane 0
    s.players[def].lanes[0] = {
      id: 'knight-1',
      cardId: 'knight',
      attack: 4,
      hp: 5,
      maxHp: 5,
      summonedRound: 1,
      statuses: [],
    };

    // End phase -> combat occurs
    const afterCombat = end(s);
    // Berserker took 4 damage (fatal), but revived once with 1 HP!
    const berserker = afterCombat.players[active].lanes[0];
    expect(berserker).not.toBeNull();
    expect(berserker?.hp).toBe(1);
    expect(berserker?.revived).toBe(true);

    // Now opponent attacks in next combat
    afterCombat.players[def].lanes[0] = {
      id: 'knight-2',
      cardId: 'knight',
      attack: 4,
      hp: 5,
      maxHp: 5,
      summonedRound: 1,
      statuses: [],
    };
    const afterSecondCombat = end(afterCombat);
    // On second lethal hit, Berserker dies permanently
    expect(afterSecondCombat.players[active].lanes[0]).toBeNull();
  });

  it('Clown bypasses enemy unit in its lane to strike Core directly', () => {
    const s = createGame(1);
    s.round = 2;
    const active = s.activePlayer;
    const def = opponent(active);
    const initialCoreHp = s.players[def].coreHp;

    // Active player has Clown (2 ATK) in lane 0
    s.players[active].lanes[0] = {
      id: 'clown-1',
      cardId: 'clown',
      attack: 2,
      hp: 3,
      maxHp: 3,
      summonedRound: 1,
      statuses: [],
    };

    // Opponent has a big Golem (3 ATK, 6 HP) in lane 0
    s.players[def].lanes[0] = {
      id: 'golem-1',
      cardId: 'golem',
      attack: 3,
      hp: 6,
      maxHp: 6,
      summonedRound: 1,
      statuses: [],
    };

    const next = end(s);
    // Clown struck enemy Core directly!
    expect(next.players[def].coreHp).toBe(initialCoreHp - 2);
    // Golem was bypassed and did not counterattack Clown!
    expect(next.players[active].lanes[0]?.hp).toBe(3);
    expect(next.players[def].lanes[0]?.hp).toBe(6);
  });

  it('Skeleton deals 1 damage to its killer upon death', () => {
    const s = createGame(1);
    s.round = 2;
    const active = s.activePlayer;
    const def = opponent(active);

    // Skeleton (1 ATK, 2 HP) in lane 0
    s.players[active].lanes[0] = {
      id: 'skeleton-1',
      cardId: 'skeleton',
      attack: 1,
      hp: 2,
      maxHp: 2,
      summonedRound: 1,
      statuses: [],
    };

    // Knight (4 ATK, 5 HP) in opponent lane 0
    s.players[def].lanes[0] = {
      id: 'knight-1',
      cardId: 'knight',
      attack: 4,
      hp: 5,
      maxHp: 5,
      summonedRound: 1,
      statuses: [],
    };

    const next = end(s);
    // Skeleton dies (took 4 damage).
    expect(next.players[active].lanes[0]).toBeNull();
    // Knight took 1 attack damage from combat + 1 Spiteful Curse damage = 2 damage total!
    expect(next.players[def].lanes[0]?.hp).toBe(5 - 1 - 1);
  });

  it('Rider grants +1 ATK to all other friendly units on summon', () => {
    const s = createGame(1);
    const active = s.activePlayer;

    // Friendly goblin in lane 0 (2 ATK)
    s.players[active].lanes[0] = {
      id: 'goblin-1',
      cardId: 'goblin',
      attack: 2,
      hp: 2,
      maxHp: 2,
      summonedRound: 1,
      statuses: [],
    };

    // Play Rider in lane 1
    s.players[active].hand = [{ id: 'rider-card', cardId: 'rider' }];
    s.players[active].mana = 5;
    const result = applyAction(s, active, { type: 'PLAY_UNIT', cardInstanceId: 'rider-card', lane: 1 });
    expect(result.error).toBeUndefined();

    // Goblin gained +1 ATK -> 3 ATK!
    expect(result.state.players[active].lanes[0]?.attack).toBe(3);
    // Rider itself has base 3 ATK
    expect(result.state.players[active].lanes[1]?.attack).toBe(3);
  });

  it('Guardian Taunt redirects attacks from empty enemy lanes when sole defender', () => {
    const s = createGame(1);
    s.round = 2;
    const active = s.activePlayer;
    const def = opponent(active);
    const initialCoreHp = s.players[def].coreHp;

    // Active player has an attacker in lane 1 (4 ATK)
    s.players[active].lanes[1] = {
      id: 'lancer-1',
      cardId: 'lancer',
      attack: 4,
      hp: 4,
      maxHp: 4,
      summonedRound: 1,
      statuses: [],
    };

    // Defender has ONLY Guardian in lane 0 (2 ATK, 8 HP)
    s.players[def].lanes[0] = {
      id: 'guardian-1',
      cardId: 'guardian',
      attack: 2,
      hp: 8,
      maxHp: 8,
      summonedRound: 1,
      statuses: [],
    };
    s.players[def].lanes[1] = null;
    s.players[def].lanes[2] = null;

    const next = end(s);
    // Lancer in lane 1 was attacking empty lane, but Guardian Taunted it!
    expect(next.players[def].coreHp).toBe(initialCoreHp); // Core took 0 damage!
    // Guardian took 4 damage from Lancer
    expect(next.players[def].lanes[0]?.hp).toBe(8 - 4);
    // Lancer took 2 counter damage from Guardian
    expect(next.players[active].lanes[1]?.hp).toBe(4 - 2);
  });

  it('Guardian Taunt redirects attacks from empty enemy lanes even when other friendly units are on the board', () => {
    const s = createGame(1);
    s.round = 2;
    const active = s.activePlayer;
    const def = opponent(active);
    const initialCoreHp = s.players[def].coreHp;

    // Attacker has Lancer (4 ATK) in lane 1, facing an empty lane
    s.players[active].lanes[1] = {
      id: 'lancer-1',
      cardId: 'lancer',
      attack: 4,
      hp: 4,
      maxHp: 4,
      summonedRound: 1,
      statuses: [],
    };

    // Defender has Guardian in lane 0 AND Knight in lane 2
    s.players[def].lanes[0] = {
      id: 'guardian-1',
      cardId: 'guardian',
      attack: 2,
      hp: 8,
      maxHp: 8,
      summonedRound: 1,
      statuses: [],
    };
    s.players[def].lanes[1] = null; // Empty lane opposite to Lancer
    s.players[def].lanes[2] = {
      id: 'knight-1',
      cardId: 'knight',
      attack: 4,
      hp: 5,
      maxHp: 5,
      summonedRound: 1,
      statuses: [],
    };

    const next = end(s);
    // Even though Defender has both Guardian and Knight, Guardian Taunts the empty lane attacker!
    expect(next.players[def].coreHp).toBe(initialCoreHp); // Core protected!
    expect(next.players[def].lanes[0]?.hp).toBe(8 - 4); // Guardian took 4 damage
    expect(next.players[active].lanes[1]?.hp).toBe(4 - 2); // Lancer took 2 counter damage
  });

  it('Archer snipes an enemy unit in another lane immediately upon summon', () => {
    const s = createGame(1);
    const active = s.activePlayer;
    const def = opponent(active);

    // Opponent has Goblin (2 ATK, 2 HP) in lane 2
    s.players[def].lanes[2] = {
      id: 'target-goblin',
      cardId: 'goblin',
      attack: 2,
      hp: 2,
      maxHp: 2,
      summonedRound: 1,
      statuses: [],
    };

    // Play Archer in lane 0 targeting target-goblin in lane 2
    s.players[active].hand = [{ id: 'archer-card', cardId: 'archer' }];
    s.players[active].mana = 5;
    const result = applyAction(s, active, {
      type: 'PLAY_UNIT',
      cardInstanceId: 'archer-card',
      lane: 0,
      targetId: 'target-goblin',
    });
    expect(result.error).toBeUndefined();

    // Goblin in lane 2 took 4 damage from Archer snipe and died!
    expect(result.state.players[def].lanes[2]).toBeNull();
    // Archer is successfully summoned in lane 0
    expect(result.state.players[active].lanes[0]?.cardId).toBe('archer');
  });

  it('DebuffCleanse cleanses Freeze and Poison from friendly unit', () => {
    const s = createGame(1);
    const active = s.activePlayer;
    s.players[active].lanes[0] = {
      id: 'unit-1',
      cardId: 'knight',
      attack: 4,
      hp: 5,
      maxHp: 5,
      summonedRound: 1,
      statuses: [
        { type: 'FREEZE', remainingCombatPhases: 1 },
        { type: 'POISON', remainingCombatPhases: 2 },
      ],
    };

    s.players[active].hand = [{ id: 'cleanse-card', cardId: 'debuffcleanse' }];
    s.players[active].mana = 5;
    const result = applyAction(s, active, {
      type: 'CAST_SPELL',
      cardInstanceId: 'cleanse-card',
      targetId: 'unit-1',
    });
    expect(result.error).toBeUndefined();
    expect(result.state.players[active].lanes[0]?.statuses).toHaveLength(0);
  });

  it('DrawCard draws 1 card from deck to hand', () => {
    const s = createGame(1);
    const active = s.activePlayer;
    const initialHandSize = s.players[active].hand.length;
    const initialDeckSize = s.players[active].deck.length;

    s.players[active].hand.push({ id: 'draw-card', cardId: 'drawcard' });
    s.players[active].mana = 5;
    const result = applyAction(s, active, {
      type: 'CAST_SPELL',
      cardInstanceId: 'draw-card',
    });
    expect(result.error).toBeUndefined();
    // Hand gained 1 card net compared to before pushing draw-card
    expect(result.state.players[active].hand.length).toBe(initialHandSize + 1);
    expect(result.state.players[active].deck.length).toBe(initialDeckSize - 1);
  });

  it('Figure creates a spectral decoy on an adjacent lane that cannot attack', () => {
    const s = createGame(1);
    const active = s.activePlayer;

    s.players[active].lanes[0] = {
      id: 'golem-source',
      cardId: 'golem',
      attack: 3,
      hp: 6,
      maxHp: 6,
      summonedRound: 1,
      statuses: [],
    };
    s.players[active].lanes[1] = null;

    s.players[active].hand = [{ id: 'figure-card', cardId: 'figure' }];
    s.players[active].mana = 5;
    const result = applyAction(s, active, {
      type: 'CAST_SPELL',
      cardInstanceId: 'figure-card',
      targetId: 'golem-source',
    });
    expect(result.error).toBeUndefined();

    // Decoy summoned in adjacent lane 1
    const decoy = result.state.players[active].lanes[1];
    expect(decoy).not.toBeNull();
    expect(decoy?.cannotAttack).not.toBe(true); expect(decoy?.isDecoy).toBe(true); expect(decoy?.attack).toBe(0);
    expect(decoy?.hp).toBe(6);
    expect(canAttack(decoy!, 2, 'UNIT')).toBe(true);
  });

  it('GainATK permanently adds +2 ATK to a friendly unit', () => {
    const s = createGame(1);
    const active = s.activePlayer;
    s.players[active].lanes[0] = {
      id: 'goblin-1',
      cardId: 'goblin',
      attack: 2,
      hp: 2,
      maxHp: 2,
      summonedRound: 1,
      statuses: [],
    };

    s.players[active].hand = [{ id: 'gainatk-card', cardId: 'gainatk' }];
    s.players[active].mana = 5;
    const result = applyAction(s, active, {
      type: 'CAST_SPELL',
      cardInstanceId: 'gainatk-card',
      targetId: 'goblin-1',
    });
    expect(result.error).toBeUndefined();
    expect(result.state.players[active].lanes[0]?.attack).toBe(4);
  });

  it('GainMana adds +2 Mana to current pool', () => {
    const s = createGame(1);
    const active = s.activePlayer;
    s.players[active].mana = 3;
    s.players[active].hand = [{ id: 'gainmana-card', cardId: 'gainmana' }];

    const result = applyAction(s, active, {
      type: 'CAST_SPELL',
      cardInstanceId: 'gainmana-card',
    });
    expect(result.error).toBeUndefined();
    // 3 mana - 0 cost + 2 mana = 5 mana
    expect(result.state.players[active].mana).toBe(5);
  });

  it('HealCore restores 4 HP up to max 30', () => {
    const s = createGame(1);
    const active = s.activePlayer;
    s.players[active].coreHp = 20;
    s.players[active].mana = 5;
    s.players[active].hand = [{ id: 'healcore-card', cardId: 'healcore' }];

    const result = applyAction(s, active, {
      type: 'CAST_SPELL',
      cardInstanceId: 'healcore-card',
    });
    expect(result.error).toBeUndefined();
    expect(result.state.players[active].coreHp).toBe(24);
  });
});

function balanceState(): GameState {
  const s = createGame(42); s.round = 3; s.firstPlayer = 0; s.activePlayer = 0;
  for (const p of s.players) { p.mana = 5; p.spellMana = 0; p.hand = []; p.deck = []; p.lanes = [null, null, null]; }
  return s;
}
function place(s: GameState, player: PlayerId, lane: Lane, id: CardId, extra: Partial<Unit> = {}): Unit {
  const c = CARDS[id];
  const u: Unit = { id: `fixture-${player}-${lane}`, cardId: id, attack: c.attack, hp: c.hp, maxHp: c.hp, summonedRound: 1, statuses: [], ...extra };
  s.players[player].lanes[lane] = u; return u;
}
function spell(s: GameState, cardId: CardId, targetId?: string) {
  const id = `spell-${s.revision}-${s.players[s.activePlayer].hand.length}`;
  s.players[s.activePlayer].hand.push({ id, cardId });
  return applyAction(s, s.activePlayer, { type: 'CAST_SPELL', cardInstanceId: id, targetId });
}
function quotaDeck(units: number): CardId[] {
  const pool = (type: 'UNIT' | 'SPELL') => Object.values(CARDS).filter(c => c.type === type).flatMap(c => [c.id, c.id, c.id]);
  return [...pool('UNIT').slice(0, units), ...pool('SPELL').slice(0, 30 - units)];
}

describe('Spell Mana Bank and deck quota', () => {
  it('starts empty, banks unused mana up to 2, zeroes regular mana, preserves bank across turns', () => {
    let s = createGame(1); const first = s.activePlayer; const second = opponent(first);
    expect(s.players.map(p => p.spellMana)).toEqual([0, 0]);
    s = end(s); expect(s.players[first].mana).toBe(0); expect(s.players[first].spellMana).toBe(2);
    expect(s.players[second].mana).toBe(5); expect(s.players[second].spellMana).toBe(0);
    s = end(s); expect(s.players[first].mana).toBe(5); expect(s.players[first].spellMana).toBe(2);
    s = end(s); expect(s.players[first].spellMana).toBe(2); expect(s.players[first].mana).toBe(0);
  });
  it.each([[0, 0, 0], [0, 1, 1], [1, 1, 2], [2, 0, 2], [1, 7, 2]])('bank %i plus %i leftover becomes %i', (bank, mana, expected) => {
    const s = balanceState(); s.players[0].spellMana = bank; s.players[0].mana = mana;
    const next = end(s); expect(next.players[0].spellMana).toBe(expected); expect(next.players[0].mana).toBe(0);
  });
  it('spells spend bank first, then only the shortfall from regular mana', () => {
    const s = balanceState(); s.players[0].spellMana = 2; const target = place(s, 1, 0, 'guardian');
    const result = spell(s, 'fireball', target.id); expect(result.error).toBeUndefined();
    expect(result.state.players[0].spellMana).toBe(0); expect(result.state.players[0].mana).toBe(4);
    expect(s.players[0].spellMana).toBe(2); expect(s.players[0].mana).toBe(5);
  });
  it('casts with bank alone and preserves bank on zero-cost spells', () => {
    let s = balanceState(); s.players[0].spellMana = 2; s.players[0].mana = 0;
    const target = place(s, 1, 0, 'knight'); const r = spell(s, 'freeze', target.id);
    expect(r.error).toBeUndefined(); expect(r.state.players[0].mana).toBe(0); expect(r.state.players[0].spellMana).toBe(0);
    s = balanceState(); s.players[0].spellMana = 2; s.players[0].mana = 0;
    s = spell(s, 'gainmana').state; expect(s.players[0].spellMana).toBe(2); expect(s.players[0].mana).toBe(2);
  });
  it('unit summoning cannot use spell mana; invalid actions spend neither pool', () => {
    const s = balanceState(); s.players[0].mana = 1; s.players[0].spellMana = 2;
    s.players[0].hand = [{ id: 'knight', cardId: 'knight' }];
    const result = applyAction(s, 0, { type: 'PLAY_UNIT', cardInstanceId: 'knight', lane: 0 });
    expect(result.error).toBeTruthy(); expect(result.state).toBe(s); expect(result.events).toEqual([]);
    s.players[0].mana = 3;
    const valid = applyAction(s, 0, { type: 'PLAY_UNIT', cardInstanceId: 'knight', lane: 0 });
    expect(valid.state.players[0].mana).toBe(0); expect(valid.state.players[0].spellMana).toBe(2);
    s.players[0].mana = 0; expect(spell(s, 'fireball', 'missing').error).toBeTruthy();
    expect(s.players[0].spellMana).toBe(2);
  });
  it('accepts 18 units, rejects 19 units, and starter still passes', () => {
    expect(validateDeck(quotaDeck(18))).toEqual({ valid: true });
    expect(validateDeck(quotaDeck(19))).toEqual({ valid: false, error: expect.stringContaining('18 Units') });
    expect(() => createGame(1, [quotaDeck(19), DECK])).toThrow('18 Units');
    expect(validateDeck(DECK).valid).toBe(true);
  });
});

describe('Debuff Cleanse and enemy spell immunity', () => {
  it('cleans both debuffs and expires precisely at start of owners next turn', () => {
    let s = balanceState(); const u = place(s, 0, 0, 'guardian', { attack: 0, statuses: [{ type: 'FREEZE', remainingCombatPhases: 1 }, { type: 'POISON', remainingCombatPhases: 2 }] });
    const result = spell(s, 'debuffcleanse', u.id); s = result.state;
    expect(s.players[0].lanes[0]?.statuses).toEqual([]); expect(s.players[0].lanes[0]?.spellImmuneUntilRound).toBe(5);
    expect(result.events.filter(e => e.type === 'STATUS_EXPIRED')).toHaveLength(2);
    expect(result.events).toContainEqual({ type: 'STATUS_APPLIED', player: 0, targetId: u.id, status: 'SPELL_IMMUNE' });
    s = end(s); expect(s.round).toBe(4); expect(s.players[0].lanes[0]?.spellImmuneUntilRound).toBe(5);
    const next = applyAction(s, 1, { type: 'END_PHASE' }); s = next.state;
    expect(s.round).toBe(5); expect(s.activePlayer).toBe(0); expect(s.players[0].lanes[0]).not.toHaveProperty('spellImmuneUntilRound');
    expect(next.events.filter(e => e.status === 'SPELL_IMMUNE' && e.type === 'STATUS_EXPIRED')).toHaveLength(1);
  });
  it.each(['fireball', 'freeze', 'poison'] as const)('blocks enemy %s without spending resources', id => {
    const s = balanceState(); const target = place(s, 1, 0, 'guardian', { spellImmuneUntilRound: 4 });
    s.players[0].spellMana = 2;
    const result = spell(s, id, target.id); expect(result.error).toContain('shielded'); expect(result.state).toBe(s); expect(result.events).toEqual([]);
    expect(result.state.players[0].mana).toBe(5); expect(result.state.players[0].spellMana).toBe(2);
  });
  it('Lightning skips only shielded enemies while damaging unshielded units', () => {
    const s = balanceState(); place(s, 1, 0, 'guardian', { spellImmuneUntilRound: 4 }); place(s, 1, 1, 'knight'); place(s, 1, 2, 'goblin');
    const result = spell(s, 'lightning'); expect(result.error).toBeUndefined();
    expect(result.state.players[1].lanes.map(u => u?.hp ?? null)).toEqual([8, 2, null]);
    expect(result.events.filter(e => e.type === 'DAMAGE_DEALT')).toHaveLength(2);
  });
  it('allows friendly Heal, Gain ATK, Figure and Fireball while shielded', () => {
    for (const id of ['heal', 'gainatk', 'figure', 'fireball'] as const) {
      const s = balanceState(); const target = place(s, 0, 0, 'guardian', { spellImmuneUntilRound: 5, hp: 6 });
      const result = spell(s, id, target.id); expect(result.error).toBeUndefined();
      expect(result.state.players[0].lanes[0]?.spellImmuneUntilRound).toBe(5);
      if (id === 'figure') expect(result.state.players[0].lanes[1]?.spellImmuneUntilRound).toBeUndefined();
    }
  });
  it('shield does not block unit battlecry or combat and expired timestamps no longer block spells', () => {
    let s = balanceState(); const target = place(s, 1, 0, 'guardian', { spellImmuneUntilRound: 4 });
    s.players[0].hand = [{ id: 'mage', cardId: 'mage' }];
    s = applyAction(s, 0, { type: 'PLAY_UNIT', cardInstanceId: 'mage', lane: 0 }).state;
    expect(s.players[1].lanes[0]?.hp).toBe(6); s = end(s); expect(s.players[1].lanes[0]?.hp).toBe(1);
    s = balanceState(); place(s, 1, 0, 'guardian', { spellImmuneUntilRound: s.round });
    expect(spell(s, 'fireball', target.id).error).toBeUndefined();
  });
});

describe('Figure and card balance', () => {
  it('Rider costs 4 and Berserker has 3 attack', () => {
    expect(CARDS.rider).toMatchObject({ cost: 4, attack: 3, hp: 4 });
    expect(CARDS.berserker).toMatchObject({ cost: 4, attack: 3, hp: 1 });
  });
  it.each(['berserker', 'clown', 'guardian', 'skeleton', 'mage', 'rider', 'archer'] as const)('copies %s HP with 0 attack and no original abilities', id => {
    const s = balanceState(); const source = place(s, 0, 0, id, { hp: 4, attack: 7 });
    const result = spell(s, 'figure', source.id); const copy = result.state.players[0].lanes[1]!;
    expect(copy).toMatchObject({ cardId: id, hp: 4, attack: 0, isDecoy: true, statuses: [] });
    expect(copy.cannotAttack).not.toBe(true); expect(canAttack(copy, s.round)).toBe(true);
    const events: Parameters<typeof handleDeathEffects>[3] = []; const killer = place(s, 1, 0, 'knight');
    expect(handleDeathEffects({ ...copy, hp: 0 }, killer, 0, events)).toBe(false); expect(events).toEqual([]); expect(killer.hp).toBe(5);
    applyBattlecry(result.state, 0, copy, 1, killer.id, events); expect(events).toEqual([]);
  });
  it('buffed decoy can attack, but a Clown decoy cannot bypass a blocker', () => {
    let s = balanceState(); const source = place(s, 0, 0, 'clown');
    s = spell(s, 'figure', source.id).state; const copy = s.players[0].lanes[1]!;
    s = spell(s, 'gainatk', copy.id).state; s.players[0].lanes[0] = null;
    place(s, 1, 1, 'knight', { attack: 0 });
    s = end(s); expect(s.players[1].coreHp).toBe(30); expect(s.players[1].lanes[1]?.hp).toBe(3);
  });
  it('Guardian decoy never taunts and Berserker decoy never revives from combat or spell damage', () => {
    let s = balanceState(); const source = place(s, 0, 0, 'guardian'); s = spell(s, 'figure', source.id).state;
    s.players[0].lanes[0] = null; place(s, 1, 2, 'knight'); s = end(s); s = end(s);
    expect(s.players[0].coreHp).toBe(26); expect(s.players[0].lanes[1]?.hp).toBe(8);
    for (const viaSpell of [true, false]) {
      s = balanceState(); place(s, 1, 0, 'berserker', { isDecoy: true, attack: 0 });
      if (viaSpell) s = spell(s, 'fireball', 'fixture-1-0').state;
      else { place(s, 0, 0, 'knight'); s = end(s); }
      expect(s.players[1].lanes[0]).toBeNull();
    }
  });
  it('Skeleton decoy causes no death curse in actual combat', () => {
    const s = balanceState(); place(s, 0, 0, 'knight'); place(s, 1, 0, 'skeleton', { isDecoy: true, attack: 0 });
    const next = end(s); expect(next.players[0].lanes[0]?.hp).toBe(5); expect(next.players[1].lanes[0]).toBeNull();
  });
  it.each([[2, 6], [6, 10], [8, 10], [10, 10]])('Heal overheals from %i to %i regardless of printed maxHP', (hp, expected) => {
    const s = balanceState(); const target = place(s, 0, 0, 'goblin', { hp });
    const result = spell(s, 'heal', target.id); expect(result.state.players[0].lanes[0]?.hp).toBe(expected); expect(result.state.players[0].lanes[0]?.maxHp).toBe(2);
    expect(result.events.find(e => e.type === 'UNIT_HEALED')?.amount).toBe(expected - hp);
  });
});
