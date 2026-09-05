export type PlayerId = 0 | 1;
export type Lane = 0 | 1 | 2;
export type CardId = 'goblin' | 'assassin' | 'archer' | 'knight' | 'guardian' | 'mage' | 'fireball' | 'freeze' | 'lightning' | 'heal' | 'poison';
export type StatusType = 'FREEZE' | 'POISON';
export interface StatusEffect { type: StatusType; remainingCombatPhases: number }
export interface CardDefinition { id: CardId; name: string; type: 'UNIT' | 'SPELL'; cost: number; attack: number; hp: number; description: string; art: string }
export interface CardInstance { id: string; cardId: CardId }
export interface Unit extends CardInstance { attack: number; hp: number; maxHp: number; summonedRound: number; statuses: StatusEffect[] }
export interface PlayerState { coreHp: number; mana: number; maxMana: number; tacticToken: boolean; hand: CardInstance[]; deck: CardInstance[]; discard: CardInstance[]; lanes: [Unit | null, Unit | null, Unit | null] }
export interface GameState { round: number; firstPlayer: PlayerId; activePlayer: PlayerId; phase: 'ACTION' | 'FINISHED'; winner: PlayerId | 'DRAW' | null; players: [PlayerState, PlayerState]; revision: number }
export type GameAction =
  | { type: 'PLAY_UNIT'; cardInstanceId: string; lane: Lane }
  | { type: 'CAST_SPELL'; cardInstanceId: string; targetId?: string }
  | { type: 'END_PHASE' }
  | { type: 'USE_TACTIC_TOKEN' };
export type EventType = 'CARD_DRAWN' | 'CARD_BURNED' | 'CARD_PLAYED' | 'UNIT_SUMMONED' | 'SPELL_CAST' | 'DAMAGE_DEALT' | 'UNIT_HEALED' | 'UNIT_DIED' | 'CORE_DAMAGED' | 'STATUS_APPLIED' | 'STATUS_EXPIRED' | 'COMBAT_STARTED' | 'COMBAT_ENDED' | 'GAME_WON' | 'GAME_DRAW' | 'ROUND_STARTED' | 'PHASE_ENDED' | 'TOKEN_USED' | 'ATTACK';
export interface GameEvent { type: EventType; player?: PlayerId; targetId?: string; cardId?: CardId; amount?: number; status?: StatusType; round?: number; audience?: PlayerId }
export interface ActionResult { state: GameState; events: GameEvent[]; error?: string }
export interface PlayerView { coreHp: number; mana: number; maxMana: number; tacticToken: boolean; handSize: number; deckSize: number; discardSize: number; lanes: PlayerState['lanes']; hand?: CardInstance[] }
export interface GameView extends Omit<GameState, 'players'> { players: [PlayerView, PlayerView]; you: PlayerId }
export type RoomStatus = 'WAITING' | 'PLAYING' | 'DISCONNECTED' | 'FINISHED' | 'CLOSED';
export interface RoomSnapshot { code: string; status: RoomStatus; you: PlayerId; game: GameView | null; events: GameEvent[]; reconnectDeadline: number | null; reason?: string }
export interface RoomCredentials { code: string; token: string; player: PlayerId }
export type Reply<T = undefined> = { ok: true; data: T } | { ok: false; error: string };
