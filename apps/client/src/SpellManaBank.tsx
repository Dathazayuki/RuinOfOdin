import { Sparkles } from 'lucide-react';

export function SpellManaBank({ amount, enemy = false }: { amount: number; enemy?: boolean }) {
  return <div className="spell-mana-bank" aria-label={`${enemy ? 'Enemy' : 'Your'} spell mana: ${amount} of 2`} title="Saved mana, for spells only. Spells spend this mana first.">
    <div><Sparkles size={15} /><strong>{amount}</strong><span>/ 2 SPELL MANA</span></div>
    <div className="spell-mana-slots" aria-hidden="true">{[0, 1].map(i => <i key={i} className={i < amount ? 'filled' : ''} />)}</div>
  </div>;
}
