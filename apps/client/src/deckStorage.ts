import { CARDS, DECK, validateDeck, type CardId } from '@core-battle/shared';

export const DECK_STORAGE_KEY = 'core-battle-custom-deck';

/** Keep recognizable incomplete decks editable; recover safely from corrupt storage. */
export function loadCustomDeck(): CardId[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(DECK_STORAGE_KEY) ?? 'null');
    if (Array.isArray(value) && value.length <= 33 && value.every(id => typeof id === 'string' && Object.hasOwn(CARDS, id))) {
      return [...value] as CardId[];
    }
  } catch { /* Storage may be disabled or contain malformed JSON. */ }
  return [...DECK];
}

export function saveCustomDeck(deck: readonly CardId[]): boolean {
  if (!validateDeck(deck).valid) return false;
  try { localStorage.setItem(DECK_STORAGE_KEY, JSON.stringify(deck)); return true; }
  catch { return false; }
}
