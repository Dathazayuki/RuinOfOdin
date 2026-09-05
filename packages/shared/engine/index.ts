import { CARDS, DECK } from '../cards';
import type { ActionResult, GameAction, GameEvent, GameState, GameView, Lane, PlayerId, PlayerState, Unit } from '../types';
import { seededRandom, shuffle } from './random';

export const LANES: readonly Lane[] = [0, 1, 2];
export const PLAYERS: readonly PlayerId[] = [0, 1];
export const opponent = (id: PlayerId): PlayerId => id === 0 ? 1 : 0;

export function createGame(seed: number): GameState {
  const random = seededRandom(seed);
  const firstPlayer: PlayerId = random() < 0.5 ? 0 : 1;
  const players = PLAYERS.map((id): PlayerState => {
    const deck = shuffle(DECK.map((cardId, i) => ({ id: `${id}-${i}`, cardId })), random);
    return { coreHp: 30, mana: id === firstPlayer ? 1 : 0, maxMana: id === firstPlayer ? 1 : 0, tacticToken: false, hand: deck.splice(0, 4), deck, discard: [], lanes: [null, null, null] };
  }) as [PlayerState, PlayerState];
  const state: GameState = { round: 1, firstPlayer, activePlayer: firstPlayer, phase: 'ACTION', winner: null, players, revision: 0 };
  draw(state, firstPlayer, []);
  return state;
}

/** Internal resolution helpers mutate only the cloned transaction state. */
function draw(state: GameState, player: PlayerId, events: GameEvent[]): void {
  const p = state.players[player];
  const card = p.deck.shift();
  if (!card) return;
  const burned = p.hand.length >= 7;
  (burned ? p.discard : p.hand).push(card);
  events.push({ type: burned ? 'CARD_BURNED' : 'CARD_DRAWN', player, cardId: card.cardId, audience: player });
}

function damage(unit: Unit, amount: number, player: PlayerId, events: GameEvent[]): void {
  unit.hp -= amount;
  events.push({ type: 'DAMAGE_DEALT', player, targetId: unit.id, amount });
}
function coreDamage(state: GameState, player: PlayerId, amount: number, events: GameEvent[]): void {
  state.players[player].coreHp = Math.max(0, state.players[player].coreHp - amount);
  events.push({ type: 'CORE_DAMAGED', player, amount });
}
function removeDead(state: GameState, events: GameEvent[]): void {
  for (const player of PLAYERS) for (const lane of LANES) {
    const unit = state.players[player].lanes[lane];
    if (unit && unit.hp <= 0) {
      state.players[player].lanes[lane] = null;
      state.players[player].discard.push({ id: unit.id, cardId: unit.cardId });
      events.push({ type: 'UNIT_DIED', player, targetId: unit.id, cardId: unit.cardId });
    }
  }
}
function checkWinner(state: GameState, events: GameEvent[]): void {
  const a = state.players[0].coreHp <= 0;
  const b = state.players[1].coreHp <= 0;
  if (!a && !b) return;
  state.phase = 'FINISHED';
  state.winner = a && b ? 'DRAW' : a ? 1 : 0;
  events.push(state.winner === 'DRAW' ? { type: 'GAME_DRAW' } : { type: 'GAME_WON', player: state.winner });
}
export function canAttack(unit: Unit, round: number): boolean {
  if (round === 1) return false;
  return unit.hp > 0 && unit.summonedRound < round && !unit.statuses.some(s => s.type === 'FREEZE');
}

function combat(state: GameState, events: GameEvent[]): void {
  const active = state.activePlayer;
  const defender = opponent(active);
  events.push({ type: 'COMBAT_STARTED', round: state.round });

  // 1: Sudden Death (Turn 21+)
  if (state.round >= 21) {
    coreDamage(state, 0, 2, events);
    coreDamage(state, 1, 2, events);
    checkWinner(state, events);
    if (state.phase === 'FINISHED') return;
  }

  // 2: Poison on all poisoned units before Auto Combat begins
  for (const p of PLAYERS) {
    for (const unit of state.players[p].lanes) {
      if (unit && unit.statuses.some(s => s.type === 'POISON')) {
        damage(unit, 2, p, events);
        unit.statuses = unit.statuses.filter(status => {
          if (status.type === 'POISON') {
            status.remainingCombatPhases--;
            if (status.remainingCombatPhases <= 0) {
              events.push({ type: 'STATUS_EXPIRED', player: p, targetId: unit.id, status: 'POISON' });
              return false;
            }
          }
          return true;
        });
      }
    }
  }
  removeDead(state, events);
  checkWinner(state, events);
  if (state.phase === 'FINISHED') return;

  // 3: Lane Combat - Active Player is Attacker; Defender counterattacks if attacked
  const hits: { unit: Unit; amount: number; player: PlayerId }[] = [];
  const coreHits: { player: PlayerId; amount: number }[] = [];

  for (const lane of LANES) {
    const a = state.players[active].lanes[lane];
    const b = state.players[defender].lanes[lane];
    const attacksA = !!a && canAttack(a, state.round);

    if (attacksA && a) {
      if (b) {
        // Both exchange damage simultaneously
        hits.push({ unit: b, amount: a.attack, player: defender });
        hits.push({ unit: a, amount: b.attack, player: active });
        events.push({ type: 'ATTACK', player: active, targetId: a.id });
      } else {
        // Empty enemy lane -> Direct Core damage
        coreHits.push({ player: defender, amount: a.attack });
        events.push({ type: 'ATTACK', player: active, targetId: a.id });
      }
    }
  }

  for (const hit of hits) damage(hit.unit, hit.amount, hit.player, events);
  for (const hit of coreHits) coreDamage(state, hit.player, hit.amount, events);
  removeDead(state, events);
  checkWinner(state, events);

  // 4: Freeze expires for active player's units after their combat phase
  for (const unit of state.players[active].lanes) {
    if (!unit) continue;
    unit.statuses = unit.statuses.filter(status => {
      if (status.type === 'FREEZE') {
        status.remainingCombatPhases--;
        if (status.remainingCombatPhases <= 0) {
          events.push({ type: 'STATUS_EXPIRED', player: active, targetId: unit.id, status: 'FREEZE' });
          return false;
        }
      }
      return true;
    });
  }
  events.push({ type: 'COMBAT_ENDED', round: state.round });

  // 5: If match continues, start Next Player Turn
  if ((state.phase as GameState['phase']) !== 'FINISHED') {
    state.round++;
    state.activePlayer = defender;
    const next = state.players[state.activePlayer];
    next.maxMana = Math.min(10, state.round);
    next.mana = next.maxMana;
    draw(state, state.activePlayer, events);
    events.push({ type: 'ROUND_STARTED', round: state.round, player: state.activePlayer });
  }
}

function findUnit(state: GameState, id?: string): { unit: Unit; player: PlayerId } | undefined {
  for (const player of PLAYERS) for (const unit of state.players[player].lanes) {
    if (unit && unit.hp > 0 && unit.id === id) return { unit, player };
  }
}

export function validateAction(state: GameState, player: PlayerId, action: GameAction): string | undefined {
  if (state.phase === 'FINISHED') return 'The match has finished.';
  if (state.activePlayer !== player) return 'Wait for your action phase.';
  const p = state.players[player];
  if (action.type === 'END_PHASE') return;
  if (action.type === 'USE_TACTIC_TOKEN') return 'Tactic token is not used in this game mode.';
  const card = p.hand.find(c => c.id === action.cardInstanceId);
  if (!card) return 'That card is not in your hand.';
  const definition = CARDS[card.cardId];
  if (p.mana < definition.cost) return 'Not enough mana.';
  if (action.type === 'PLAY_UNIT') {
    if (definition.type !== 'UNIT') return 'Choose a unit card.';
    if (!LANES.includes(action.lane)) return 'Invalid lane.';
    if (p.lanes[action.lane]) return 'Your lane is occupied.';
  } else if (action.type === 'CAST_SPELL') {
    if (definition.type !== 'SPELL') return 'Choose a spell card.';
    if (card.cardId === 'lightning') return;
    const target = findUnit(state, action.targetId);
    if (!target) return 'Choose a living unit as the target.';
    if (card.cardId === 'heal' && target.player !== player) return 'Heal requires a friendly unit.';
    if (['freeze', 'poison'].includes(card.cardId) && target.player === player) return 'Choose an enemy unit.';
  } else return 'Unknown action.';
}

export function applyAction(input: GameState, player: PlayerId, action: GameAction): ActionResult {
  const error = validateAction(input, player, action);
  if (error) return { state: input, events: [], error };
  const state = structuredClone(input);
  const events: GameEvent[] = [];
  const p = state.players[player];
  state.revision++;
  if (action.type === 'USE_TACTIC_TOKEN') {
    return { state: input, events: [], error: 'Tactic token is not used in this game mode.' };
  } else if (action.type === 'END_PHASE') {
    events.push({ type: 'PHASE_ENDED', player });
    combat(state, events);
  } else {
    const index = p.hand.findIndex(c => c.id === action.cardInstanceId);
    const card = p.hand.splice(index, 1)[0]!;
    const definition = CARDS[card.cardId];
    p.mana -= definition.cost;
    events.push({ type: 'CARD_PLAYED', player, cardId: card.cardId });
    if (action.type === 'PLAY_UNIT') {
      // Section 13.5: battlecry resolves before the mage enters the board.
      const enemy = state.players[opponent(player)].lanes[action.lane];
      if (card.cardId === 'mage' && enemy) { damage(enemy, 2, opponent(player), events); removeDead(state, events); }
      p.lanes[action.lane] = { ...card, attack: definition.attack, hp: definition.hp, maxHp: definition.hp, summonedRound: state.round, statuses: [] };
      events.push({ type: 'UNIT_SUMMONED', player, targetId: card.id, cardId: card.cardId });
    } else {
      p.discard.push(card);
      events.push({ type: 'SPELL_CAST', player, cardId: card.cardId, targetId: action.targetId });
      const target = findUnit(state, action.targetId);
      if (card.cardId === 'lightning') {
        for (const unit of state.players[opponent(player)].lanes) if (unit) damage(unit, 3, opponent(player), events);
      } else if (target) {
        if (card.cardId === 'fireball') damage(target.unit, 4, target.player, events);
        if (card.cardId === 'heal') {
          const amount = Math.min(4, target.unit.maxHp - target.unit.hp);
          target.unit.hp += amount;
          events.push({ type: 'UNIT_HEALED', player, targetId: target.unit.id, amount });
        }
        if (card.cardId === 'freeze' || card.cardId === 'poison') {
          const type = card.cardId === 'freeze' ? 'FREEZE' : 'POISON';
          target.unit.statuses = target.unit.statuses.filter(s => s.type !== type);
          target.unit.statuses.push({ type, remainingCombatPhases: type === 'FREEZE' ? 1 : 2 });
          events.push({ type: 'STATUS_APPLIED', player: target.player, targetId: target.unit.id, status: type });
        }
      }
      removeDead(state, events);
    }
  }
  return { state, events };
}

export function legalActions(state: GameState, player: PlayerId): GameAction[] {
  if (state.phase !== 'ACTION' || state.activePlayer !== player) return [];
  const candidates: GameAction[] = [{ type: 'END_PHASE' }];
  for (const card of state.players[player].hand) {
    if (CARDS[card.cardId].type === 'UNIT') for (const lane of LANES) candidates.push({ type: 'PLAY_UNIT', cardInstanceId: card.id, lane });
    else if (card.cardId === 'lightning') candidates.push({ type: 'CAST_SPELL', cardInstanceId: card.id });
    else for (const p of state.players) for (const unit of p.lanes) if (unit) candidates.push({ type: 'CAST_SPELL', cardInstanceId: card.id, targetId: unit.id });
  }
  return candidates.filter(action => !validateAction(state, player, action));
}

export function viewFor(state: GameState, you: PlayerId): GameView {
  return {
    round: state.round, firstPlayer: state.firstPlayer, activePlayer: state.activePlayer, phase: state.phase, winner: state.winner, revision: state.revision, you,
    players: state.players.map((p, id) => ({ coreHp: p.coreHp, mana: p.mana, maxMana: p.maxMana, tacticToken: p.tacticToken, handSize: p.hand.length, deckSize: p.deck.length, discardSize: p.discard.length, lanes: structuredClone(p.lanes), ...(id === you ? { hand: structuredClone(p.hand) } : {}) })) as GameView['players'],
  };
}
export function eventsFor(events: GameEvent[], player: PlayerId): GameEvent[] {
  return events.filter(e => e.audience === undefined || e.audience === player).map(({ audience: _audience, ...event }) => { void _audience; return event; });
}
export function forfeit(input: GameState, loser: PlayerId): ActionResult {
  if (input.phase === 'FINISHED') return { state: input, events: [], error: 'The match has finished.' };
  const state = structuredClone(input);
  state.phase = 'FINISHED'; state.winner = opponent(loser); state.revision++;
  return { state, events: [{ type: 'GAME_WON', player: opponent(loser) }] };
}
