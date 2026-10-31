let ctx: AudioContext | null = null;
let voice: HTMLAudioElement | null = null;
let enabled = true;

export function soundEnabled(): boolean {
  return enabled;
}

export function setSoundEnabled(value: boolean): void {
  enabled = value;
  if (!value) stopVoice();
}

export function stopVoice(): void {
  if (!voice) return;
  voice.pause();
  voice = null;
}

export function unlockSound(): void {
  const Ctx = window.AudioContext;
  if (!ctx) ctx = new Ctx({ latencyHint: "interactive" });
  if (ctx.state === "suspended") void ctx.resume();
}

function tone(freq: number, dur: number, type: OscillatorType, amount: number, delay = 0): void {
  if (!ctx || !enabled) return;
  const start = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(amount, start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(start);
  osc.stop(start + dur + 0.02);
}

export function sfxDeal(): void {
  tone(480, 0.07, "triangle", 0.04);
  tone(720, 0.05, "sine", 0.03, 0.05);
}

export function sfxTake(): void {
  tone(640, 0.08, "sine", 0.05);
  tone(880, 0.1, "triangle", 0.04, 0.07);
}

export function sfxFish(): void {
  tone(196, 0.14, "sine", 0.045);
}

export function sfxBook(): void {
  tone(523, 0.12, "triangle", 0.06);
  tone(659, 0.14, "triangle", 0.05, 0.09);
  tone(784, 0.2, "sine", 0.045, 0.18);
}

export function speak(src: string): void {
  if (!enabled) return;
  stopVoice();
  const audio = new Audio(src);
  audio.volume = 0.95;
  voice = audio;
  void audio.play().catch(() => {});
}
