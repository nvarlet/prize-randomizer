const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioCtx();
  return ctx;
}

export function playTick() {
  const audio = getCtx();
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
