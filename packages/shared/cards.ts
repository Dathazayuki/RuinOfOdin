import type { CardDefinition, CardId } from './types';

export const CARDS: Record<CardId, CardDefinition> = {
  goblin: { id: 'goblin', name: 'Goblin', type: 'UNIT', cost: 1, attack: 2, hp: 2, description: 'A quick foothold in an open lane.', art: 'UnitArt/Golbin.png' },
  assassin: { id: 'assassin', name: 'Assassin', type: 'UNIT', cost: 2, attack: 4, hp: 2, description: 'Strikes with lethal precision from the shadows. Fragile in direct combat.', art: 'UnitArt/Assassin.png' },
  archer: { id: 'archer', name: 'Archer', type: 'UNIT', cost: 3, attack: 2, hp: 3, description: 'Summon: strikes an enemy unit in another lane immediately.', art: 'UnitArt/Archer.png' },
  knight: { id: 'knight', name: 'Knight', type: 'UNIT', cost: 3, attack: 4, hp: 5, description: 'Hold the line. Turn the tide.', art: 'UnitArt/Knight.png' },
  guardian: { id: 'guardian', name: 'Guardian', type: 'UNIT', cost: 4, attack: 2, hp: 8, description: 'Taunt: While on your board, enemy units on empty lanes must attack Guardian instead of your Core.', art: 'UnitArt/Guardian.png' },
  mage: { id: 'mage', name: 'Mage', type: 'UNIT', cost: 5, attack: 5, hp: 4, description: 'Battlecry: deal 2 damage to the enemy unit in this lane.', art: 'UnitArt/Mage.png' },
  berserker: { id: 'berserker', name: 'Berserker', type: 'UNIT', cost: 4, attack: 3, hp: 1, description: 'Undying Rage: Revives once upon death with 1 HP.', art: 'UnitArt/Berserker.png' },
  clown: { id: 'clown', name: 'Clown', type: 'UNIT', cost: 3, attack: 2, hp: 3, description: 'Sneak Attack: Bypasses enemy units in this lane to strike the enemy Core directly.', art: 'UnitArt/Clown.png' },
  golem: { id: 'golem', name: 'Golem', type: 'UNIT', cost: 4, attack: 3, hp: 6, description: 'A massive stone titan that absorbs immense damage.', art: 'UnitArt/Golem.png' },
  lancer: { id: 'lancer', name: 'Lancer', type: 'UNIT', cost: 3, attack: 4, hp: 4, description: 'A fierce and balanced vanguard charging into the fray.', art: 'UnitArt/Lancer.png' },
  rider: { id: 'rider', name: 'Rider', type: 'UNIT', cost: 4, attack: 3, hp: 4, description: 'Cavalry Charge: Battlecry grants +1 ATK to all your other units on the board.', art: 'UnitArt/Rider.png' },
  skeleton: { id: 'skeleton', name: 'Skeleton', type: 'UNIT', cost: 1, attack: 1, hp: 2, description: 'Spiteful Curse: Upon death, deals 1 damage to the unit that destroyed it.', art: 'UnitArt/Skeleton.png' },

  fireball: { id: 'fireball', name: 'Fireball', type: 'SPELL', cost: 3, attack: 0, hp: 0, description: 'Deal 4 damage to any unit. Cannot target a core.', art: 'SpellIcon/FireBall.png', spellTarget: 'ANY_UNIT' },
  freeze: { id: 'freeze', name: 'Freeze', type: 'SPELL', cost: 2, attack: 0, hp: 0, description: 'An enemy unit cannot initiate attacks for 1 combat. It can defend.', art: 'SpellIcon/Freeze.png', spellTarget: 'ENEMY_UNIT' },
  lightning: { id: 'lightning', name: 'Lightning', type: 'SPELL', cost: 4, attack: 0, hp: 0, description: 'Deal 3 damage to all enemy units simultaneously.', art: 'SpellIcon/Lighning.png', spellTarget: 'NONE' },
  heal: { id: 'heal', name: 'Heal', type: 'SPELL', cost: 2, attack: 0, hp: 0, description: 'Restore 4 health to a friendly unit. Can overheal up to 10 HP.', art: 'SpellIcon/Heal.png', spellTarget: 'FRIENDLY_UNIT' },
  poison: { id: 'poison', name: 'Poison', type: 'SPELL', cost: 2, attack: 0, hp: 0, description: 'An enemy unit takes 2 damage before each of the next 2 combats.', art: 'SpellIcon/Poison.png', spellTarget: 'ENEMY_UNIT' },
  debuffcleanse: { id: 'debuffcleanse', name: 'Debuff Cleanse', type: 'SPELL', cost: 1, attack: 0, hp: 0, description: 'Remove Debuff from a friendly unit. Shield it from all enemy spells until your next turn.', art: 'SpellIcon/DebuffCleanse.png', spellTarget: 'FRIENDLY_UNIT' },
  drawcard: { id: 'drawcard', name: 'Draw Card', type: 'SPELL', cost: 1, attack: 0, hp: 0, description: 'Draw 1 card from your deck.', art: 'SpellIcon/DrawCard.png', spellTarget: 'NONE' },
  figure: { id: 'figure', name: 'Figure', type: 'SPELL', cost: 1, attack: 0, hp: 0, description: 'Copy a friendly unit into an empty lane with 0 ATK and its current HP. The decoy has no original abilities.', art: 'SpellIcon/Figure.png', spellTarget: 'FRIENDLY_UNIT' },
  gainatk: { id: 'gainatk', name: 'Gain ATK', type: 'SPELL', cost: 2, attack: 0, hp: 0, description: 'Grant +2 ATK to a friendly unit.', art: 'SpellIcon/GainATK.png', spellTarget: 'FRIENDLY_UNIT' },
  gainmana: { id: 'gainmana', name: 'Gain Mana', type: 'SPELL', cost: 0, attack: 0, hp: 0, description: 'Gain +2 Mana for the current turn.', art: 'SpellIcon/GainMana.png', spellTarget: 'NONE' },
  healcore: { id: 'healcore', name: 'Heal Core', type: 'SPELL', cost: 3, attack: 0, hp: 0, description: 'Restore 4 health to your Core (up to 30 max).', art: 'SpellIcon/HealCore.png', spellTarget: 'NONE' },
};
export const DECK: readonly CardId[] = [
  'goblin', 'goblin', 'goblin',
  'assassin',
  'archer',
  'knight',
  'guardian',
  'mage',
  'berserker',
  'clown',
  'golem',
  'lancer',
  'rider',
  'skeleton', 'skeleton',
  'fireball', 'fireball',
  'freeze',
  'lightning',
  'heal', 'heal',
  'poison',
  'debuffcleanse', 'debuffcleanse',
  'drawcard', 'drawcard',
  'figure',
  'gainatk',
  'gainmana',
  'healcore',
];
export function coreArt(hp: number): string {
  return `CoreBase/${hp <= 0 ? 'Core_Destroyed' : hp <= 6 ? 'Core_Low_Hp' : hp <= 15 ? 'Core_Damaged' : 'Core_Idle'}.png`;
}

/** Shared deck contract used by engine, server and deck builder. */
export function validateDeck(deck: readonly CardId[]): { valid: boolean; error?: string } {
  if (!Array.isArray(deck) || deck.length !== 30) return { valid: false, error: 'Your deck must contain exactly 30 cards.' };
  const counts = new Map<string, number>();
  for (const id of deck) {
    if (typeof id !== 'string' || !Object.hasOwn(CARDS, id)) return { valid: false, error: 'Your deck contains an unknown card.' };
    const count = (counts.get(id) ?? 0) + 1;
    if (count > 3) return { valid: false, error: 'A deck may contain at most 3 copies of each card.' };
    counts.set(id, count);
  }
  const units = deck.filter(id => CARDS[id as CardId].type === 'UNIT').length;
  if (units > 18) return { valid: false, error: 'A deck may contain at most 18 Units and must contain at least 12 Spells.' };
  return { valid: true };
}
