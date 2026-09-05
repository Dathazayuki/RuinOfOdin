import type { GameAction, GameState, PlayerId } from '../types';
import { applyAction, canAttack, legalActions, opponent } from './index';

function finishTurn(input: GameState): GameState {
  if (input.phase === 'FINISHED') return input;
  return applyAction(input, input.activePlayer, { type: 'END_PHASE' }).state;
}
function evaluate(state: GameState, player: PlayerId): number {
  if (state.winner !== null) return state.winner === 'DRAW' ? 0 : state.winner === player ? 100000 : -100000;
  const value = (id: PlayerId) => {
    const p = state.players[id];
    return p.coreHp * 5 + p.lanes.reduce((sum, u, lane) => sum + (u ? u.hp * 1.2 + u.attack * 2 + (canAttack(u, state.round) && !state.players[opponent(id)].lanes[lane] ? u.attack * 2 : 0) : 0), 0);
  };
  return value(player) - value(opponent(player));
}
/** Chooses commands only; all simulations use the shared engine. */
export function chooseBotAction(state: GameState, player: PlayerId, difficulty: 'easy' | 'normal', random: () => number = () => 0.5): GameAction {
  const actions = legalActions(state, player);
  if (!actions.length) return { type: 'END_PHASE' };
  const useful = actions.filter(a => {
    if (a.type !== 'CAST_SPELL') return true;
    const card = state.players[player].hand.find(c => c.id === a.cardInstanceId)!;
    const target = state.players.flatMap(p => p.lanes).find(u => u?.id === a.targetId);
    if (card.cardId === 'heal') return !!target && target.hp < target.maxHp;
    if (card.cardId === 'fireball') return state.players[opponent(player)].lanes.some(u => u?.id === a.targetId);
    if (card.cardId === 'lightning') return state.players[opponent(player)].lanes.some(Boolean);
    return !target?.statuses.some(s => s.type.toLowerCase() === card.cardId);
  });
  if (difficulty === 'easy') {
    const units = useful.filter(a => a.type === 'PLAY_UNIT');
    const spells = useful.filter(a => a.type === 'CAST_SPELL');
    const choices = units.length ? units : spells;
    if (choices.length) return choices[Math.min(choices.length - 1, Math.floor(random() * choices.length))]!;
    return { type: 'END_PHASE' };
  }
  // Bounded beam search: removal sequences and combat lethal.
  let best: GameAction = { type: 'END_PHASE' };
  let bestScore = evaluate(finishTurn(state), player);
  let frontier: { state: GameState; first: GameAction; penalty: number; score: number }[] = [];
  for (let depth = 0; depth < 3; depth++) {
    const nodes = depth === 0 ? [{ state, first: null, penalty: 0 }] : frontier;
    const next: typeof frontier = [];
    for (const node of nodes) for (const action of depth === 0 ? useful : legalActions(node.state, player)) {
      if (action.type === 'END_PHASE') continue;
      const result = applyAction(node.state, player, action).state;
      const penalty = node.penalty + 0.15;
      const score = evaluate(finishTurn(result), player) + (evaluate(result, player) - evaluate(node.state, player)) * 0.05 - penalty;
      const first = node.first ?? action;
      if (score > bestScore) { bestScore = score; best = first; }
      next.push({ state: result, first, penalty, score });
    }
    frontier = next.sort((a, b) => b.score - a.score).slice(0, 8);
  }
  return best;
}
