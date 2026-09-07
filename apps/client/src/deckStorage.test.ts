import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DECK } from '@core-battle/shared';
import { DECK_STORAGE_KEY, loadCustomDeck, saveCustomDeck } from './deckStorage';

let memory: Map<string, string>;
beforeEach(() => {
  memory = new Map();
  vi.stubGlobal('localStorage', { getItem: (key: string) => memory.get(key) ?? null, setItem: (key: string, value: string) => memory.set(key, value) });
});
afterEach(() => vi.unstubAllGlobals());
describe('custom deck persistence', () => {
  it('defaults to an independent starter deck and saves/reloads a custom deck', () => {
    expect(loadCustomDeck()).toEqual(DECK); expect(loadCustomDeck()).not.toBe(DECK);
    const deck = [...DECK].reverse(); expect(saveCustomDeck(deck)).toBe(true); expect(loadCustomDeck()).toEqual(deck);
  });
  it.each(['{invalid json', 'null', '{}', '["unknown"]', '["__proto__"]', '[123]'])('recovers corrupt storage: %s', value => {
    memory.set(DECK_STORAGE_KEY, value); expect(loadCustomDeck()).toEqual(DECK);
  });
  it('keeps incomplete decks editable and refuses to persist invalid decks', () => {
    memory.set(DECK_STORAGE_KEY, JSON.stringify(DECK.slice(1)));
    expect(loadCustomDeck()).toHaveLength(29); expect(saveCustomDeck(DECK.slice(1))).toBe(false);
  });
  it('works when storage is blocked and reports failed persistence', () => {
    vi.stubGlobal('localStorage', { getItem: () => { throw new Error('Blocked'); }, setItem: () => { throw new Error('Blocked'); } });
    expect(loadCustomDeck()).toEqual(DECK); expect(saveCustomDeck(DECK)).toBe(false);
  });
});
