import type { GameEvent } from '@core-battle/shared';

let context: AudioContext | null = null;
export function unlockAudio() {
  try { context ??= new AudioContext(); if (context.state === 'suspended') void context.resume(); } catch { /* Sound is optional. */ }
}
export function playSounds(events: GameEvent[], enabled: boolean, you: number) {
  if (!enabled || !context || context.state !== 'running') return;
  const cues: Partial<Record<GameEvent['type'], number>> = { CARD_DRAWN: 520, CARD_PLAYED: 330, ATTACK: 130, DAMAGE_DEALT: 95, SPELL_CAST: 650, STATUS_APPLIED: 780, UNIT_DIED: 65, CORE_DAMAGED: 80, GAME_WON: 880, GAME_DRAW: 440 };
  events.filter(e => cues[e.type]).slice(-6).forEach((event, i) => {
    const oscillator = context!.createOscillator(); const gain = context!.createGain();
    const at = context!.currentTime + i * 0.08;
    oscillator.type = event.type === 'SPELL_CAST' ? 'sine' : 'triangle';
    oscillator.frequency.setValueAtTime(event.type === 'GAME_WON' && event.player !== you ? 110 : cues[event.type]!, at);
    gain.gain.setValueAtTime(0.0001, at); gain.gain.exponentialRampToValueAtTime(0.04, at + 0.01); gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.18);
    oscillator.connect(gain); gain.connect(context!.destination); oscillator.start(at); oscillator.stop(at + 0.2);
  });
}
