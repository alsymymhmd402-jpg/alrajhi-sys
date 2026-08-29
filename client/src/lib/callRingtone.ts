import { brandAssets } from "./brandAssets";

export type RingtoneHandle = { stop: () => void };

/** Plays the institution-provided ringtone; Web Audio remains a fallback for browsers that block media. */
export function startCallRingtone(kind: "incoming" | "outgoing"): RingtoneHandle {
  if (typeof window === "undefined") return { stop: () => undefined };
  const audio = new Audio(brandAssets.sounds.callRingtone);
  audio.preload = "auto";
  audio.loop = true;
  audio.volume = 0.7;
  let stopped = false;
  const fallback = () => {
    if (stopped) return;
    const AudioContextClass = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const context = new AudioContextClass();
    let timer: number | undefined;
    const pulse = () => {
      if (stopped) return;
      const now = context.currentTime;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(kind === "incoming" ? 740 : 590, now);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.11, now + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(now);
      oscillator.stop(now + 0.44);
      timer = window.setTimeout(pulse, 1800);
    };
    void context.resume().then(pulse).catch(() => undefined);
    audio.dataset.fallbackTimer = String(timer ?? "");
    audio.dataset.fallbackContext = "active";
    (audio as HTMLAudioElement & { __fallbackStop?: () => void }).__fallbackStop = () => { if (timer) window.clearTimeout(timer); void context.close(); };
  };
  void audio.play().catch(fallback);
  return {
    stop: () => {
      stopped = true;
      audio.pause();
      audio.currentTime = 0;
      (audio as HTMLAudioElement & { __fallbackStop?: () => void }).__fallbackStop?.();
    },
  };
}
