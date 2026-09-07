import type { CardInstance, GameEvent, GameState, Lane, PlayerId, Unit } from '../types';
import { LANES, opponent } from './index';

/** Helper to deal damage to a unit and emit damage event */
export function dealDamage(unit: Unit, amount: number, player: PlayerId, events: GameEvent[]): void {
  unit.hp -= amount;
  events.push({ type: 'DAMAGE_DEALT', player, targetId: unit.id, amount });
}

/** Helper to heal a unit and emit heal event */
export function healUnit(unit: Unit, amount: number, player: PlayerId, events: GameEvent[]): void {
  const actual = Math.max(0, Math.min(amount, 10 - unit.hp));
  unit.hp += actual;
  events.push({ type: 'UNIT_HEALED', player, targetId: unit.id, amount: actual });
}

/** Helper to draw a card for a player */
export function drawCard(state: GameState, player: PlayerId, events: GameEvent[]): void {
  const p = state.players[player];
  const card = p.deck.shift();
  if (!card) return;
  const burned = p.hand.length >= 7;
  (burned ? p.discard : p.hand).push(card);
  events.push({ type: burned ? 'CARD_BURNED' : 'CARD_DRAWN', player, cardId: card.cardId, audience: player });
}

/**
 * Applies Battlecry / Summon effects when a unit is played.
 */
export function applyBattlecry(
  state: GameState,
  player: PlayerId,
  card: CardInstance,
  lane: Lane,
  targetId: string | undefined,
  events: GameEvent[]
): void {
  if ('isDecoy' in card && card.isDecoy) return;
  const enemy = opponent(player);

  // 1. Mage: Deal 2 damage to enemy unit in the same lane
  if (card.cardId === 'mage') {
    const enemyUnit = state.players[enemy].lanes[lane];
    if (enemyUnit && enemyUnit.hp > 0) {
      dealDamage(enemyUnit, 2, enemy, events);
    }
  }

  // 2. Rider: Grants +1 ATK to all other friendly units on the board
  if (card.cardId === 'rider') {
    for (const l of LANES) {
      const u = state.players[player].lanes[l];
      if (u && u.hp > 0) {
        u.attack += 1;
      }
    }
  }

  // 3. Archer: Cross-lane snipe upon summon
  // Deals Archer's attack (4 damage) to a targeted enemy unit in another lane
  if (card.cardId === 'archer' && targetId) {
    for (const l of LANES) {
      if (l !== lane) {
        const enemyUnit = state.players[enemy].lanes[l];
        if (enemyUnit && enemyUnit.id === targetId && enemyUnit.hp > 0) {
          dealDamage(enemyUnit, 2, enemy, events);
          break;
        }
      }
    }
  }
}

/**
 * Applies spell effects when a spell card is cast.
 */
export function applySpellEffect(
  state: GameState,
  player: PlayerId,
  card: CardInstance,
  targetUnit: { unit: Unit; player: PlayerId } | undefined,
  events: GameEvent[]
): void {
  const enemy = opponent(player);
  const p = state.players[player];

  switch (card.cardId) {
    // 1. Fireball: 4 damage to target unit
    case 'fireball': {
      if (targetUnit) {
        dealDamage(targetUnit.unit, 4, targetUnit.player, events);
      }
      break;
    }

    // 2. Freeze: freeze enemy unit for 1 combat phase
    case 'freeze': {
      if (targetUnit) {
        targetUnit.unit.statuses = targetUnit.unit.statuses.filter(s => s.type !== 'FREEZE');
        targetUnit.unit.statuses.push({ type: 'FREEZE', remainingCombatPhases: 1 });
        events.push({ type: 'STATUS_APPLIED', player: targetUnit.player, targetId: targetUnit.unit.id, status: 'FREEZE' });
      }
      break;
    }

    // 3. Lightning: 3 damage to all enemy units simultaneously
    case 'lightning': {
      for (const unit of state.players[enemy].lanes) {
        if (unit && unit.hp > 0 && (unit.spellImmuneUntilRound ?? 0) <= state.round) {
          dealDamage(unit, 3, enemy, events);
        }
      }
      break;
    }

    // 4. Heal: restore 4 HP to a friendly unit
    case 'heal': {
      if (targetUnit) {
        healUnit(targetUnit.unit, 4, player, events);
      }
      break;
    }

    // 5. Poison: poison enemy unit for 2 combat phases (2 damage each)
    case 'poison': {
      if (targetUnit) {
        targetUnit.unit.statuses = targetUnit.unit.statuses.filter(s => s.type !== 'POISON');
        targetUnit.unit.statuses.push({ type: 'POISON', remainingCombatPhases: 2 });
        events.push({ type: 'STATUS_APPLIED', player: targetUnit.player, targetId: targetUnit.unit.id, status: 'POISON' });
      }
      break;
    }

    // 6. Debuff Cleanse: Cleanse Freeze and Poison from a friendly unit
    case 'debuffcleanse': {
      if (targetUnit && targetUnit.player === player) {
        targetUnit.unit.statuses = targetUnit.unit.statuses.filter(status => {
          if (status.type !== 'FREEZE' && status.type !== 'POISON') return true;
          events.push({ type: 'STATUS_EXPIRED', player, targetId: targetUnit.unit.id, status: status.type });
          return false;
        });
        targetUnit.unit.spellImmuneUntilRound = state.round + 2;
        events.push({ type: 'STATUS_APPLIED', player, targetId: targetUnit.unit.id, status: 'SPELL_IMMUNE' });
      }
      break;
    }

    // 7. Draw Card: Draw 1 card from deck
    case 'drawcard': {
      drawCard(state, player, events);
      break;
    }

    // 8. Figure: Create a spectral decoy copy on an adjacent empty lane
    case 'figure': {
      if (targetUnit && targetUnit.player === player) {
        const sourceLane = p.lanes.findIndex(u => u?.id === targetUnit.unit.id);
        if (sourceLane >= 0) {
          // Find adjacent empty lanes: for lane 0 -> 1; for lane 1 -> 0 or 2; for lane 2 -> 1
          const adjacentLanes: Lane[] = sourceLane === 0 ? [1, 2] : sourceLane === 1 ? [0, 2] : [1, 0];
          const emptyLane = adjacentLanes.find(l => p.lanes[l] === null);
          if (emptyLane !== undefined) {
            const decoyId = `${targetUnit.unit.id}-decoy-${state.revision}`;
            const decoy: Unit = {
              id: decoyId,
              cardId: targetUnit.unit.cardId,
              attack: 0,
              hp: targetUnit.unit.hp,
              maxHp: targetUnit.unit.maxHp,
              summonedRound: state.round,
              statuses: [],
              isDecoy: true, // No intrinsic abilities; normal attack eligibility still applies.
            };
            p.lanes[emptyLane] = decoy;
            events.push({ type: 'UNIT_SUMMONED', player, targetId: decoyId, cardId: targetUnit.unit.cardId });
          }
        }
      }
      break;
    }

    // 9. Gain ATK: Grant +2 ATK permanently to a friendly unit
    case 'gainatk': {
      if (targetUnit && targetUnit.player === player) {
        targetUnit.unit.attack += 2;
      }
      break;
    }

    // 10. Gain Mana: +2 Mana for current turn
    case 'gainmana': {
      p.mana += 2;
      break;
    }

    // 11. Heal Core: Restore 4 HP to your Core (max 30)
    case 'healcore': {
      const healed = Math.min(4, 30 - p.coreHp);
      p.coreHp += healed;
      events.push({ type: 'UNIT_HEALED', player, amount: healed });
      break;
    }
  }
}

/**
 * Handles deathrattles / revive mechanics when a unit takes fatal damage.
 * Returns true if death was prevented (e.g. Berserker revive), false if unit truly dies.
 */
export function handleDeathEffects(
  dyingUnit: Unit,
  killerUnit: Unit | null,
  player: PlayerId,
  events: GameEvent[]
): boolean {
  if (dyingUnit.isDecoy) return false;
  // 1. Berserker: Revives once upon death with 1 HP
  if (dyingUnit.cardId === 'berserker' && !dyingUnit.revived) {
    dyingUnit.hp = 1;
    dyingUnit.revived = true;
    events.push({ type: 'UNIT_HEALED', player, targetId: dyingUnit.id, amount: 1 });
    return true; // Revived, not dead!
  }

  // 2. Skeleton: Spiteful Curse deals 1 damage to the killer unit upon death
  if (dyingUnit.cardId === 'skeleton' && killerUnit && killerUnit.hp > 0) {
    dealDamage(killerUnit, 1, opponent(player), events);
  }

  return false; // Unit died
}
