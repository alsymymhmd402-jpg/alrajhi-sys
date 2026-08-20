export type RingtoneHandle = { stop: () => void };

/** A lightweight in-browser ring pattern. It creates no audio file and stops cleanly with the call state. */
export function startCallRingtone(kind: "incoming" | "outgoing"): RingtoneHandle {
  if (typeof window === "undefined") return { stop: () => undefined };
  const AudioContextClass = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return { stop: () => undefined };
  const context = new AudioContextClass();
  let stopped = false;
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
    if (kind === "incoming") {
      const second = context.createOscillator();
      const secondGain = context.createGain();
      second.type = "sine";
      second.frequency.setValueAtTime(880, now + 0.5);
      secondGain.gain.setValueAtTime(0.0001, now + 0.5);
      secondGain.gain.exponentialRampToValueAtTime(0.09, now + 0.525);
      secondGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.88);
      second.connect(secondGain).connect(context.destination);
      second.start(now + 0.5);
      second.stop(now + 0.9);
    }
    timer = window.setTimeout(pulse, kind === "incoming" ? 2200 : 1800);
  };
  void context.resume().then(pulse).catch(() => undefined);
  return { stop: () => { stopped = true; if (timer) window.clearTimeout(timer); void context.close(); } };
}
