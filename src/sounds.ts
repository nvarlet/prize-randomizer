/* Wheel audio, synthesised so there are no files to ship or wait on.
 *
 * A detent click is two things layered: a short burst of filtered noise for the
 * contact, and a low tone for the weight behind it. A bare oscillator on its own
 * is what makes these things sound like a cheap beep. */

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noise: AudioBuffer | null = null;
let muted = false;
let lastTickAt = 0;

const VOLUME = 0.85;
/** Slots whip past every ~17ms at full speed, far faster than a wheel clicks. */
const MIN_TICK_GAP_MS = 45;

function engine(): { c: AudioContext; out: GainNode } | null {
  if (muted || typeof window === "undefined") return null;

  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as any).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor() as AudioContext;
    master = ctx.createGain();
    master.gain.value = VOLUME;
    master.connect(ctx.destination);
  }

  // Contexts start suspended until the page has been interacted with. Every
  // draw begins with a click or a keypress, so resuming here is enough.
  if (ctx.state === "suspended") ctx.resume().catch(() => {});

  return master ? { c: ctx, out: master } : null;
}

function noiseBuffer(c: AudioContext): AudioBuffer {
  if (!noise) {
    const frames = Math.ceil(c.sampleRate * 0.12);
    noise = c.createBuffer(1, frames, c.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1;
  }
  return noise;
}

/** Open the context from inside a click handler, before the first tick is due. */
export function primeAudio() {
  engine();
}

export function setMuted(next: boolean) {
  muted = next;
  if (ctx && master) {
    // Cut anything mid-ring rather than letting it tail off after a mute.
    master.gain.setValueAtTime(next ? 0 : VOLUME, ctx.currentTime);
  }
}

export function isMuted() {
  return muted;
}

/**
 * One detent click. `weight` runs from 0 while the wheel is whipping round to 1
 * for the last slow clicks; it drops the pitch and adds body, which is what
 * makes a wheel audibly wind down rather than just tick more slowly.
 */
export function playTick(weight = 0.5) {
  const e = engine();
  if (!e) return;

  const now = performance.now();
  if (now - lastTickAt < MIN_TICK_GAP_MS) return;
  lastTickAt = now;

  const { c, out } = e;
  const t = c.currentTime;
  const w = Math.min(1, Math.max(0, weight));
  // No two pegs sound identical; without this it turns into a machine gun.
  const vary = 0.94 + Math.random() * 0.12;

  const click = c.createBufferSource();
  click.buffer = noiseBuffer(c);

  const band = c.createBiquadFilter();
  band.type = "bandpass";
  band.frequency.value = (2600 - 900 * w) * vary;
  band.Q.value = 1.4 + w;

  const clickGain = c.createGain();
  clickGain.gain.setValueAtTime(0, t);
  clickGain.gain.linearRampToValueAtTime(0.1 + 0.1 * w, t + 0.001);
  clickGain.gain.exponentialRampToValueAtTime(0.0006, t + 0.03 + 0.02 * w);

  click.connect(band).connect(clickGain).connect(out);
  click.start(t);
  click.stop(t + 0.09);

  const body = c.createOscillator();
  body.type = "triangle";
  body.frequency.setValueAtTime((260 - 70 * w) * vary, t);
  body.frequency.exponentialRampToValueAtTime(90, t + 0.05);

  const bodyGain = c.createGain();
  bodyGain.gain.setValueAtTime(0.05 + 0.07 * w, t);
  bodyGain.gain.exponentialRampToValueAtTime(0.0006, t + 0.05 + 0.03 * w);

  body.connect(bodyGain).connect(out);
  body.start(t);
  body.stop(t + 0.11);
}

/** The wheel dropping into place: a heavier detent, then a warm two-note chime. */
export function playLand() {
  const e = engine();
  if (!e) return;

  const { c, out } = e;
  const t = c.currentTime;

  const thunk = c.createOscillator();
  thunk.type = "triangle";
  thunk.frequency.setValueAtTime(190, t);
  thunk.frequency.exponentialRampToValueAtTime(70, t + 0.09);

  const thunkGain = c.createGain();
  thunkGain.gain.setValueAtTime(0.22, t);
  thunkGain.gain.exponentialRampToValueAtTime(0.0006, t + 0.14);

  thunk.connect(thunkGain).connect(out);
  thunk.start(t);
  thunk.stop(t + 0.18);

  const clack = c.createBufferSource();
  clack.buffer = noiseBuffer(c);

  const band = c.createBiquadFilter();
  band.type = "bandpass";
  band.frequency.value = 1500;
  band.Q.value = 1.1;

  const clackGain = c.createGain();
  clackGain.gain.setValueAtTime(0.15, t);
  clackGain.gain.exponentialRampToValueAtTime(0.0006, t + 0.05);

  clack.connect(band).connect(clackGain).connect(out);
  clack.start(t);
  clack.stop(t + 0.08);

  // E5 then B5. A bare fifth reads as warm and finished without tipping into
  // game-show fanfare, which would wear thin over a dozen draws.
  [
    { hz: 659.25, at: 0.06 },
    { hz: 987.77, at: 0.14 },
  ].forEach(({ hz, at }) => {
    const osc = c.createOscillator();
    osc.type = "sine";
    osc.frequency.value = hz;

    const gain = c.createGain();
    const start = t + at;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.11, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0006, start + 0.75);

    osc.connect(gain).connect(out);
    osc.start(start);
    osc.stop(start + 0.8);
  });
}
