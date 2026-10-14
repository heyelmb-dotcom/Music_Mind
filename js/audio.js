// Audio engine: plain Web Audio, simple synths, per-track channel strips.
import { midiToFreq } from './theory.js';

let ctx = null;
let master, comp, reverb, analyser;
let noiseBuf = null;
let pinkBuf = null;
let unlocked = false;

export function getCtx() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC({ latencyHint: 'interactive' });
    master = ctx.createGain();
    master.gain.value = 0.8;
    comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -12;
    comp.ratio.value = 4;
    comp.attack.value = 0.005;
    comp.release.value = 0.15;
    analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.8;
    master.connect(comp);
    comp.connect(analyser);
    analyser.connect(ctx.destination);
    reverb = ctx.createConvolver();
    reverb.buffer = makeImpulse(2.4, 2.5);
    const revOut = ctx.createGain();
    revOut.gain.value = 0.9;
    reverb.connect(revOut);
    revOut.connect(master);
  }
  return ctx;
}

export const getMaster = () => (getCtx(), master);
export const getAnalyser = () => (getCtx(), analyser);
export const getReverb = () => (getCtx(), reverb);

// iOS: Web Audio is muted by the ring/silent switch unless the audio session
// is "playback". Playing a silent <audio> element flips it.
export async function unlockAudio() {
  const c = getCtx();
  if (c.state !== 'running') await c.resume();
  if (unlocked) return;
  unlocked = true;
  try {
    if (navigator.audioSession) navigator.audioSession.type = 'playback';
  } catch (_) { /* not supported */ }
  try {
    const a = new Audio(silentWav());
    a.setAttribute('playsinline', '');
    a.loop = true;
    a.volume = 0.0001;
    await a.play();
  } catch (_) { /* fine */ }
}

function silentWav() {
  const sr = 8000, n = 800;
  const buf = new ArrayBuffer(44 + n);
  const v = new DataView(buf);
  const w = (o, s) => [...s].forEach((ch, i) => v.setUint8(o + i, ch.charCodeAt(0)));
  w(0, 'RIFF'); v.setUint32(4, 36 + n, true); w(8, 'WAVE'); w(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, sr, true); v.setUint32(28, sr, true); v.setUint16(32, 1, true);
  v.setUint16(34, 8, true); w(36, 'data'); v.setUint32(40, n, true);
  for (let i = 0; i < n; i++) v.setUint8(44 + i, 128);
  let s = '';
  new Uint8Array(buf).forEach((b) => (s += String.fromCharCode(b)));
  return 'data:audio/wav;base64,' + btoa(s);
}

function makeImpulse(seconds, decay) {
  const c = ctx;
  const len = Math.floor(c.sampleRate * seconds);
  const buf = c.createBuffer(2, len, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
  }
  return buf;
}

function noise() {
  if (!noiseBuf) {
    const len = ctx.sampleRate;
    noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }
  const s = ctx.createBufferSource();
  s.buffer = noiseBuf;
  return s;
}

// Pink noise (Paul Kellet's filter) — the reference signal for EQ ear training.
export function pinkNoise() {
  getCtx();
  if (!pinkBuf) {
    const len = ctx.sampleRate * 4;
    pinkBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = pinkBuf.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759;
      b2 = 0.969 * b2 + w * 0.153852; b3 = 0.8665 * b3 + w * 0.3104856;
      b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898;
      d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
      b6 = w * 0.115926;
    }
  }
  const s = ctx.createBufferSource();
  s.buffer = pinkBuf;
  s.loop = true;
  return s;
}

function env(g, t, peak, attack, decay, sustain, dur, release) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(peak, t + attack);
  g.gain.setTargetAtTime(peak * sustain, t + attack, Math.max(decay, 0.001) / 3);
  g.gain.setTargetAtTime(0.0001, t + Math.max(dur, attack), Math.max(release, 0.005) / 4);
}

// ---------- Drums ----------
const DRUMS = {
  kick(t, v, out) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(160, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.13);
    g.gain.setValueAtTime(v, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    o.connect(g).connect(out);
    o.start(t); o.stop(t + 0.55);
  },
  snare(t, v, out) {
    const n = noise(), hp = ctx.createBiquadFilter(), g = ctx.createGain();
    hp.type = 'highpass'; hp.frequency.value = 1200;
    g.gain.setValueAtTime(v * 0.6, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    n.connect(hp).connect(g).connect(out);
    n.start(t); n.stop(t + 0.25);
    const o = ctx.createOscillator(), og = ctx.createGain();
    o.type = 'triangle'; o.frequency.setValueAtTime(190, t);
    o.frequency.exponentialRampToValueAtTime(150, t + 0.08);
    og.gain.setValueAtTime(v * 0.5, t);
    og.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    o.connect(og).connect(out);
    o.start(t); o.stop(t + 0.15);
  },
  clap(t, v, out) {
    const n = noise(), bp = ctx.createBiquadFilter(), g = ctx.createGain();
    bp.type = 'bandpass'; bp.frequency.value = 1500; bp.Q.value = 0.9;
    g.gain.setValueAtTime(0.0001, t);
    [0, 0.011, 0.022].forEach((d) => {
      g.gain.setValueAtTime(v * 0.8, t + d);
      g.gain.exponentialRampToValueAtTime(v * 0.15, t + d + 0.009);
    });
    g.gain.setValueAtTime(v * 0.7, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    n.connect(bp).connect(g).connect(out);
    n.start(t); n.stop(t + 0.25);
  },
  hat(t, v, out) { hatLike(t, v * 0.35, 0.045, 8000, out); },
  openhat(t, v, out) { hatLike(t, v * 0.3, 0.32, 7000, out); },
  shaker(t, v, out) {
    const n = noise(), bp = ctx.createBiquadFilter(), g = ctx.createGain();
    bp.type = 'bandpass'; bp.frequency.value = 6500; bp.Q.value = 1.2;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(v * 0.35, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    n.connect(bp).connect(g).connect(out);
    n.start(t); n.stop(t + 0.1);
  },
  rim(t, v, out) {
    const o = ctx.createOscillator(), g = ctx.createGain(), hp = ctx.createBiquadFilter();
    o.type = 'square'; o.frequency.value = 1750;
    hp.type = 'highpass'; hp.frequency.value = 900;
    g.gain.setValueAtTime(v * 0.3, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.035);
    o.connect(hp).connect(g).connect(out);
    o.start(t); o.stop(t + 0.05);
  },
  tom(t, v, out) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(85, t + 0.25);
    g.gain.setValueAtTime(v * 0.8, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    o.connect(g).connect(out);
    o.start(t); o.stop(t + 0.4);
  },
  '808'(t, v, out) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(110, t);
    o.frequency.exponentialRampToValueAtTime(48, t + 0.08);
    g.gain.setValueAtTime(v, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 1.1);
    o.connect(g).connect(out);
    o.start(t); o.stop(t + 1.2);
  },
};

function hatLike(t, v, decay, freq, out) {
  const n = noise(), hp = ctx.createBiquadFilter(), g = ctx.createGain();
  hp.type = 'highpass'; hp.frequency.value = freq;
  g.gain.setValueAtTime(v, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + decay);
  n.connect(hp).connect(g).connect(out);
  n.start(t); n.stop(t + decay + 0.02);
}

export const DRUM_VOICES = Object.keys(DRUMS);

// ---------- Tonal synths ----------
// osc: [type, detuneCents, octaveShift, level]
const SYNTHS = {
  // bass
  sub: { osc: [['sine', 0, 0, 1], ['triangle', 0, 1, 0.25]], a: 0.005, d: 0.3, s: 0.9, r: 0.08, cut: 900, fenv: 0, q: 0.5 },
  sawbass: { osc: [['sawtooth', 0, 0, 0.7], ['square', 0, -1, 0.35]], a: 0.004, d: 0.25, s: 0.6, r: 0.06, cut: 300, fenv: 1400, fdec: 0.18, q: 6 },
  pluckbass: { osc: [['square', 0, 0, 0.6]], a: 0.002, d: 0.16, s: 0.25, r: 0.05, cut: 250, fenv: 2400, fdec: 0.1, q: 4 },
  // keys / chords
  epiano: { osc: [['sine', 0, 0, 0.7], ['triangle', 3, 1, 0.18]], a: 0.004, d: 1.1, s: 0.25, r: 0.35, cut: 4000, fenv: 0, q: 0.5 },
  organ: { osc: [['sine', 0, 0, 0.5], ['sine', 0, 1, 0.3], ['sine', 2, 2, 0.15]], a: 0.01, d: 0.1, s: 1, r: 0.08, cut: 5000, fenv: 0, q: 0.5 },
  pluck: { osc: [['sawtooth', -6, 0, 0.4], ['sawtooth', 6, 0, 0.4]], a: 0.002, d: 0.25, s: 0, r: 0.2, cut: 600, fenv: 3500, fdec: 0.15, q: 2 },
  grit: { osc: [['sawtooth', -9, 0, 0.45], ['sawtooth', 9, 0, 0.45], ['square', 0, -1, 0.25]], a: 0.003, d: 0.2, s: 0.85, r: 0.08, cut: 2600, fenv: 0, q: 1, drive: 6 },
  // pads
  pad: { osc: [['sawtooth', -10, 0, 0.3], ['sawtooth', 10, 0, 0.3], ['triangle', 0, 1, 0.15]], a: 0.45, d: 1, s: 0.85, r: 0.9, cut: 1300, fenv: 0, q: 0.8 },
  strings: { osc: [['sawtooth', -6, 0, 0.3], ['sawtooth', 7, 0, 0.3], ['sawtooth', 0, 1, 0.12]], a: 0.25, d: 0.5, s: 0.9, r: 0.6, cut: 2400, fenv: 0, q: 0.6 },
  choir: { osc: [['triangle', -5, 0, 0.4], ['triangle', 5, 0, 0.4], ['sine', 0, 1, 0.2]], a: 0.3, d: 0.6, s: 0.9, r: 0.7, cut: 1800, fenv: 0, q: 3 },
  // leads
  square: { osc: [['square', 0, 0, 0.45]], a: 0.005, d: 0.2, s: 0.7, r: 0.1, cut: 3200, fenv: 0, q: 1 },
  saw: { osc: [['sawtooth', -4, 0, 0.35], ['sawtooth', 4, 0, 0.35]], a: 0.005, d: 0.2, s: 0.7, r: 0.12, cut: 2800, fenv: 1000, fdec: 0.2, q: 2 },
  flute: { osc: [['sine', 0, 0, 0.7], ['triangle', 0, 0, 0.2]], a: 0.04, d: 0.2, s: 0.85, r: 0.15, cut: 3000, fenv: 0, q: 0.5, vib: 5 },
  bell: { osc: [['sine', 0, 0, 0.6]], a: 0.002, d: 1.2, s: 0, r: 0.6, cut: 8000, fenv: 0, q: 0.5, fm: 3.5 },
  guitar: { osc: [['sawtooth', 0, 0, 0.5], ['triangle', 2, 0, 0.3]], a: 0.002, d: 0.5, s: 0.15, r: 0.25, cut: 900, fenv: 2200, fdec: 0.12, q: 1.5, drive: 2 },
};

export const TONAL_VOICES = Object.keys(SYNTHS);

let shaperCache = {};
function shaper(amount) {
  if (!shaperCache[amount]) {
    const n = 1024, curve = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = (i / (n - 1)) * 2 - 1;
      curve[i] = Math.tanh(x * amount) / Math.tanh(amount);
    }
    shaperCache[amount] = curve;
  }
  const ws = ctx.createWaveShaper();
  ws.curve = shaperCache[amount];
  return ws;
}

function playSynth(name, t, midi, dur, vel, out) {
  const p = SYNTHS[name] || SYNTHS.square;
  const f = midiToFreq(midi);
  const g = ctx.createGain();
  const filt = ctx.createBiquadFilter();
  filt.type = 'lowpass';
  filt.Q.value = p.q;
  filt.frequency.setValueAtTime(p.cut, t);
  if (p.fenv) {
    filt.frequency.setValueAtTime(p.cut + p.fenv, t);
    filt.frequency.setTargetAtTime(p.cut, t, (p.fdec || 0.2) / 3);
  }
  const stopAt = t + dur + p.r * 2 + 0.05;
  const mix = ctx.createGain();
  mix.gain.value = 1;
  for (const [type, det, oct, lvl] of p.osc) {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = f * Math.pow(2, oct);
    o.detune.value = det;
    if (p.vib) {
      const lfo = ctx.createOscillator(), lg = ctx.createGain();
      lfo.frequency.value = p.vib; lg.gain.value = 9;
      lfo.connect(lg).connect(o.detune);
      lfo.start(t + 0.15); lfo.stop(stopAt);
    }
    if (p.fm) {
      const m = ctx.createOscillator(), mg = ctx.createGain();
      m.frequency.value = f * p.fm;
      mg.gain.setValueAtTime(f * 2.5, t);
      mg.gain.exponentialRampToValueAtTime(f * 0.05 + 0.01, t + 0.8);
      m.connect(mg).connect(o.frequency);
      m.start(t); m.stop(stopAt);
    }
    const og = ctx.createGain();
    og.gain.value = lvl;
    o.connect(og).connect(mix);
    o.start(t); o.stop(stopAt);
  }
  let chain = mix;
  if (p.drive) { const ws = shaper(p.drive); chain.connect(ws); chain = ws; }
  chain.connect(filt).connect(g).connect(out);
  env(g, t, vel * 0.5, p.a, p.d, p.s, dur, p.r);
}

export function trigger(voice, t, midi, dur, vel, out) {
  getCtx();
  out = out || master;
  if (DRUMS[voice]) DRUMS[voice](t, vel, out);
  else playSynth(voice, t, midi, dur, vel, out);
}

// ---------- Channel strip ----------
// voices -> input -> lowpass -> duck(sidechain) -> fader -> pan -> master (+ reverb send)
export function createChannel(dest) {
  getCtx();
  dest = dest || master;
  const input = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 20000;
  filter.Q.value = 0.7;
  const duck = ctx.createGain();
  const fader = ctx.createGain();
  const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : ctx.createGain();
  const send = ctx.createGain();
  send.gain.value = 0;
  input.connect(filter).connect(duck).connect(fader).connect(pan).connect(dest);
  fader.connect(send).connect(reverb);
  return {
    input,
    set({ vol = 0.8, cutoff = 1, reverb: rv = 0, pan: pn = 0 }) {
      const now = ctx.currentTime;
      fader.gain.setTargetAtTime(vol, now, 0.02);
      // cutoff 0..1 mapped exponentially 80Hz..20kHz
      filter.frequency.setTargetAtTime(80 * Math.pow(250, cutoff), now, 0.02);
      send.gain.setTargetAtTime(rv * 0.7, now, 0.02);
      if (pan.pan) pan.pan.setTargetAtTime(pn, now, 0.02);
    },
    duck(t, amount, recover) {
      const gp = duck.gain;
      gp.cancelScheduledValues(t);
      gp.setValueAtTime(1, t);
      gp.linearRampToValueAtTime(1 - amount, t + 0.006);
      gp.linearRampToValueAtTime(1, t + recover);
    },
    disconnect() {
      try { pan.disconnect(); send.disconnect(); } catch (_) { /* gone */ }
    },
  };
}

// A disposable output bus: start a new one to cut off whatever was playing on the old one.
let bus = null;
export function freshBus() {
  getCtx();
  if (bus) {
    const old = bus;
    old.gain.setTargetAtTime(0, ctx.currentTime, 0.015);
    setTimeout(() => old.disconnect(), 200);
  }
  bus = ctx.createGain();
  bus.connect(master);
  return bus;
}
export function stopBus() {
  if (!bus) return;
  bus.gain.setTargetAtTime(0, ctx.currentTime, 0.015);
  const old = bus;
  setTimeout(() => old.disconnect(), 200);
  bus = null;
}

// The analyser only if audio has already started (never creates the AudioContext).
export const peekAnalyser = () => (ctx ? analyser : null);
