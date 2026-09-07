import { motion } from 'framer-motion';
import { Heart, Sparkles, Swords } from 'lucide-react';
import { CARDS, type CardInstance } from '@core-battle/shared';
import { art } from './assets';

export function Card({ card, selected, disabled, onClick, compact = false }: { card: CardInstance; selected?: boolean; disabled?: boolean; onClick?: () => void; compact?: boolean }) {
  const definition = CARDS[card.cardId];
  const spellLabel = definition.spellTarget === 'NONE'
    ? (definition.id === 'lightning' ? 'ALL ENEMIES' : definition.id === 'healcore' ? 'HEAL CORE' : definition.id === 'gainmana' ? '+2 MANA' : 'DRAW CARD')
    : definition.spellTarget === 'FRIENDLY_UNIT' ? 'FRIENDLY UNIT'
    : definition.spellTarget === 'ENEMY_UNIT' ? 'ENEMY UNIT'
    : 'TARGET UNIT';

  return <motion.button layout initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -35, scale: 0.8 }} whileHover={disabled || !onClick ? {} : { y: -10 }} className={`card ${definition.type.toLowerCase()} ${selected ? 'selected' : ''} ${compact ? 'compact' : ''}`} disabled={disabled} tabIndex={onClick ? 0 : -1} onClick={onClick} aria-label={`${definition.name}, ${definition.cost} mana${definition.type === 'UNIT' ? `, ${definition.attack} attack, ${definition.hp} health` : ''}`} aria-pressed={selected} title={definition.description}>
    <span className="card-cost">{definition.cost}</span><div className="card-art"><img src={art(definition.art)} alt="" /></div>
    <div className="card-copy"><span className="card-kind">{definition.type === 'UNIT' ? 'UNIT' : 'SPELL'}</span><strong>{definition.name}</strong><p>{definition.description}</p></div>
    <div className="card-footer">{definition.type === 'UNIT' ? <><span><Swords size={12} />{definition.attack}</span><span><Heart size={12} />{definition.hp}</span></> : <span><Sparkles size={12} />{spellLabel}</span>}</div>
  </motion.button>;
}
