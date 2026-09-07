import { useEffect, useRef, useState } from 'react';
import { Check, Minus, Plus, RotateCcw, X } from 'lucide-react';
import { CARDS, DECK, validateDeck, type CardId } from '@core-battle/shared';
import { Card } from './Card';
import { useGame } from './store';

export function DeckBuilder() {
  const { customDeck, setCustomDeck, closeDeckBuilder } = useGame();
  const [draft, setDraft] = useState<CardId[]>(() => [...customDeck]);
  const [tab, setTab] = useState<'ALL' | 'UNIT' | 'SPELL'>('ALL');
  const dialog = useRef<HTMLElement>(null);
  const validation = validateDeck(draft);
  const units = draft.filter(id => CARDS[id].type === 'UNIT').length;
  const average = draft.length ? (draft.reduce((sum, id) => sum + CARDS[id].cost, 0) / draft.length).toFixed(1) : '0.0';

  useEffect(() => {
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); closeDeckBuilder(); }
      if (event.key !== 'Tab') return;
      const buttons = dialog.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled):not([tabindex="-1"])');
      const first = buttons?.[0]; const last = buttons?.[buttons.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialog.current)) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener('keydown', onKey);
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus();
    };
  }, [closeDeckBuilder]);

  const remove = (id: CardId) => setDraft(cards => { const index = cards.indexOf(id); return index < 0 ? cards : cards.filter((_, i) => i !== index); });
  const add = (id: CardId) => setDraft(cards => cards.filter(c => c === id).length >= 3 ? cards : [...cards, id]);
  const allCards = Object.values(CARDS);
  const visibleCards = allCards.filter(c => tab === 'ALL' || c.type === tab);

  return <div className="modal-backdrop" onClick={closeDeckBuilder}>
    <section ref={dialog} tabIndex={-1} className="modal collection deck-builder" role="dialog" aria-modal="true" aria-labelledby="deck-builder-title" onClick={e => e.stopPropagation()}>
      <button className="icon-button modal-close" onClick={closeDeckBuilder} aria-label="Close deck builder"><X /></button>
      <span className="eyebrow">YOUR CARDS. YOUR STRATEGY.</span>
      <h2 id="deck-builder-title">Deck Builder</h2>
      <p>Choose exactly 30 cards from 23 types. Up to 3 copies of each card. At most 18 Units and at least 12 Spells. Your saved deck is used for Solo and Multiplayer.</p>
      <div className="deck-summary" aria-live="polite">
        <strong className={`deck-count ${validation.valid ? 'valid' : 'invalid'}`}>{draft.length} / 30 Cards</strong>
        <span className={units > 18 ? 'quota-exceeded' : undefined}>{units} Units (max 18)</span><span>{draft.length - units} Spells</span><span>Avg. mana: {average}</span>
      </div>
      <div className="builder-filter-tabs" role="tablist" aria-label="Filter cards">
        <button role="tab" aria-selected={tab === 'ALL'} className={`tab-button ${tab === 'ALL' ? 'active' : ''}`} onClick={() => setTab('ALL')}>All (23)</button>
        <button role="tab" aria-selected={tab === 'UNIT'} className={`tab-button ${tab === 'UNIT' ? 'active' : ''}`} onClick={() => setTab('UNIT')}>Units (12)</button>
        <button role="tab" aria-selected={tab === 'SPELL'} className={`tab-button ${tab === 'SPELL' ? 'active' : ''}`} onClick={() => setTab('SPELL')}>Spells (11)</button>
      </div>
      <div className="collection-grid builder-grid">{visibleCards.map(card => {
        const count = draft.filter(id => id === card.id).length;
        return <div key={card.id} className="builder-card">
          <Card compact card={{ id: card.id, cardId: card.id }} />
          <div className="copy-counter" role="group" aria-label={`${card.name} copies`}>
            <button aria-label={`Remove ${card.name}`} onClick={() => remove(card.id)} disabled={count === 0}><Minus size={15} /></button>
            <span aria-label={`${count} of 3 copies`}>{count} / 3</span>
            <button aria-label={`Add ${card.name}`} onClick={() => add(card.id)} disabled={count >= 3}><Plus size={15} /></button>
          </div>
        </div>;
      })}</div>
      <div className="builder-footer">
        <p role="status">{validation.valid ? 'Your deck is ready for battle.' : validation.error}</p>
        <div className="builder-actions">
          <button className="secondary" onClick={() => setDraft([...DECK])}><RotateCcw size={14} /> Reset to Starter Deck</button>
          <button className="primary" disabled={!validation.valid} onClick={() => setCustomDeck(draft)}>Save &amp; Ready <Check size={16} /></button>
        </div>
      </div>
    </section>
  </div>;
}
