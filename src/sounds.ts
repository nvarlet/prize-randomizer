let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (ctx) return ctx;
  if (typeof window === "undefined") return null;

  const AudioCtx =
    window.AudioContext || ((window as any).webkitAudioContext as typeof window.AudioContext | undefined);
  if (!AudioCtx) return null;

  ctx = new AudioCtx();
  return ctx;
}

export function playTick() {
  const audio = getCtx();
  if (!audio) return;
  const osc = audio.createOscillator();
  const gain = audio.createGain();

  osc.type = "sine";
  osc.frequency.value = 800;
  gain.gain.setValueAtTime(0.06, audio.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.05);

  osc.connect(gain);
  gain.connect(audio.destination);
  osc.start(audio.currentTime);
  osc.stop(audio.currentTime + 0.05);
}

export function playDing() {
  const audio = getCtx();
  if (!audio) return;

  [880, 1108, 1320].forEach((freq, i) => {
    const osc = audio.createOscillator();
    const gain = audio.createGain();

    osc.type = "sine";
    osc.frequency.value = freq;
    const startTime = audio.currentTime + i * 0.06;
    gain.gain.setValueAtTime(0.12, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4);

    osc.connect(gain);
    gain.connect(audio.destination);
    osc.start(startTime);
    osc.stop(startTime + 0.4);
  });
}
