import type { CardDefinition, CardId } from './types';

export const CARDS: Record<CardId, CardDefinition> = {
  goblin: { id: 'goblin', name: 'Goblin', type: 'UNIT', cost: 1, attack: 2, hp: 2, description: 'A quick foothold in an open lane.', art: 'UnitArt/Golbin.png' },
  assassin: { id: 'assassin', name: 'Assassin', type: 'UNIT', cost: 2, attack: 4, hp: 2, description: 'Strikes with lethal precision from the shadows. Fragile in direct combat.', art: 'UnitArt/Assassin.png' },
  archer: { id: 'archer', name: 'Archer', type: 'UNIT', cost: 3, attack: 4, hp: 3, description: 'A precise strike. A fragile defense.', art: 'UnitArt/Archer.png' },
  knight: { id: 'knight', name: 'Knight', type: 'UNIT', cost: 3, attack: 4, hp: 5, description: 'Hold the line. Turn the tide.', art: 'UnitArt/Knight.png' },
  guardian: { id: 'guardian', name: 'Guardian', type: 'UNIT', cost: 4, attack: 2, hp: 8, description: 'An unyielding shield for your core.', art: 'UnitArt/Guardian.png' },
  mage: { id: 'mage', name: 'Mage', type: 'UNIT', cost: 5, attack: 5, hp: 4, description: 'Battlecry: deal 2 damage to the enemy unit in this lane.', art: 'UnitArt/Mage.png' },
  fireball: { id: 'fireball', name: 'Fireball', type: 'SPELL', cost: 3, attack: 0, hp: 0, description: 'Deal 4 damage to any unit. Cannot target a core.', art: 'SpellIcon/FireBall.png' },
  freeze: { id: 'freeze', name: 'Freeze', type: 'SPELL', cost: 2, attack: 0, hp: 0, description: 'An enemy unit cannot initiate attacks for 1 combat. It can defend.', art: 'SpellIcon/Freeze.png' },
  lightning: { id: 'lightning', name: 'Lightning', type: 'SPELL', cost: 4, attack: 0, hp: 0, description: 'Deal 3 damage to all enemy units simultaneously.', art: 'SpellIcon/Lighning.png' },
  heal: { id: 'heal', name: 'Heal', type: 'SPELL', cost: 2, attack: 0, hp: 0, description: 'Restore 4 health to a friendly unit, up to its maximum.', art: 'SpellIcon/Heal.png' },
  poison: { id: 'poison', name: 'Poison', type: 'SPELL', cost: 2, attack: 0, hp: 0, description: 'An enemy unit takes 2 damage before each of the next 2 combats.', art: 'SpellIcon/Poison.png' },
};
export const DECK: readonly CardId[] = [
  'goblin', 'goblin', 'goblin',
  'assassin', 'assassin', 'assassin',
  'archer', 'archer', 'archer',
  'knight', 'knight', 'knight',
  'guardian', 'guardian',
  'mage',
  'fireball', 'fireball', 'fireball',
  'freeze', 'freeze', 'freeze',
  'lightning', 'lightning', 'lightning',
  'heal', 'heal', 'heal',
  'poison', 'poison', 'poison',
];
export function coreArt(hp: number): string {
  return `CoreBase/${hp <= 0 ? 'Core_Destroyed' : hp <= 6 ? 'Core_Low_Hp' : hp <= 15 ? 'Core_Damaged' : 'Core_Idle'}.png`;
}
