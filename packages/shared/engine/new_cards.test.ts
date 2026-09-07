import { describe, expect, it } from 'vitest';
import type { GameState } from '../types';
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
    expect(decoy?.cannotAttack).toBe(true);
    expect(decoy?.hp).toBe(6);
    expect(canAttack(decoy!, 2, 'UNIT')).toBe(false);
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
