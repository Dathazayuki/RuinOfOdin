import { describe, expect, it } from 'vitest';
import { createGame, viewFor } from '@core-battle/shared';
import { availableActions } from './store';

describe('client uses authoritative resource and shield rules', () => {
  it('offers a spell paid by banked mana but never a unit paid by that bank', () => {
    const state = createGame(1); const you = state.activePlayer;
    state.players[you].mana = 0; state.players[you].spellMana = 2;
    state.players[you].hand = [{ id: 'heal', cardId: 'heal' }, { id: 'goblin', cardId: 'goblin' }];
    state.players[you].lanes[0] = { id: 'target', cardId: 'goblin', hp: 2, maxHp: 2, attack: 2, statuses: [], summonedRound: 1 };
    const actions = availableActions(viewFor(state, you));
    expect(actions).toContainEqual({ type: 'CAST_SPELL', cardInstanceId: 'heal', targetId: 'target' });
    expect(actions.some(a => a.type === 'PLAY_UNIT')).toBe(false);
  });
  it('does not highlight an enemy with Spell Shield as a spell target', () => {
    const state = createGame(1); const you = state.activePlayer; const enemy = you === 0 ? 1 : 0;
    state.players[you].hand = [{ id: 'fireball', cardId: 'fireball' }];
    state.players[enemy].lanes[0] = { id: 'shielded', cardId: 'goblin', hp: 2, maxHp: 2, attack: 2, statuses: [], summonedRound: 1, spellImmuneUntilRound: 3 };
    expect(availableActions(viewFor(state, you)).some(a => a.type === 'CAST_SPELL')).toBe(false);
  });
});
