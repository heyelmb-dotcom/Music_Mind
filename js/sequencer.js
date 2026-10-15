// Lookahead scheduler that plays a project live (edits apply instantly).
import { getCtx, createChannel, trigger } from './audio.js';
import { chordMidi } from './theory.js';
import { BASE_MIDI, audibleTracks, gateSteps, hasHit, isMelodic, chordAt, bassMidi } from './project.js';
import { setting } from './store.js';

const LOOKAHEAD = 0.12;
const TICK_MS = 25;

export const stepSeconds = (p) => 60 / p.bpm / (p.spb / 4);

// Schedule everything that happens on step `s` at time `t`.
export function scheduleStep(p, channels, s, t, muted) {
  const total = p.bars * p.spb;
  const sd = stepSeconds(p);
  const tracks = audibleTracks(p).filter((tr) => !muted || !muted.has(tr.id));
  for (const tr of tracks) {
    const v = tr.steps[s];
    if (!hasHit(tr, v)) continue;
    const ch = channels[tr.id];
    if (!ch) continue;
    if (tr.kind === 'drum') {
      trigger(tr.voice, t, 0, 0, v, ch.input);
      if (tr.voice === 'kick' || tr.voice === '808') {
        const beat = sd * (p.spb / 4);
        for (const other of p.tracks) if (other.duck && channels[other.id]) channels[other.id].duck(t, 0.8, Math.min(0.32, beat * 0.75));
      }
    } else if (tr.kind === 'bass') {
      // stored at real pitch; played up an octave, at real pitch, or both (Settings)
      const real = bassMidi(p, v);
      const dur = gateSteps(tr, s, total) * sd;
      const mode = setting('bassPlay');
      if (mode !== 'real') trigger(tr.voice, t, real + 12, dur, mode === 'both' ? 0.6 : 0.9, ch.input);
      if (mode !== 'up') trigger(tr.voice, t, real, dur, 0.9, ch.input);
    } else if (isMelodic(tr)) {
      const midi = BASE_MIDI[tr.kind] + p.key + v + tr.octave * 12;
      trigger(tr.voice, t, midi, gateSteps(tr, s, total) * sd, 0.9, ch.input);
    } else {
      const notes = chordMidi(chordAt(p, s).r, p.key, BASE_MIDI.chords + 2 + tr.octave * 12);
      const dur = gateSteps(tr, s, total) * sd;
      for (const n of notes) trigger(tr.voice, t, n, dur, (v || 1) * 0.55, ch.input);
    }
  }
}

function swingOffset(p, s) {
  return p.spb === 16 && s % 2 === 1 ? p.swing * stepSeconds(p) : 0;
}

export class Player {
  constructor() {
    this.channels = {};
    this.playing = false;
    this.queue = [];
    this.onStep = null;
    this.getProject = null;
  }

  syncChannels(p, dest) {
    getCtx();
    for (const tr of p.tracks) {
      if (!this.channels[tr.id]) this.channels[tr.id] = createChannel(dest);
      this.channels[tr.id].set(tr);
    }
  }

  start(getProject) {
    if (this.playing) return;
    this.getProject = getProject;
    const ctx = getCtx();
    this.syncChannels(getProject());
    this.playing = true;
    this.step = 0;
    this.nextTime = ctx.currentTime + 0.06;
    this.timer = setInterval(() => this.tick(), TICK_MS);
    this.tick();
    const frame = () => {
      if (!this.playing) return;
      const now = ctx.currentTime;
      let cur = null;
      while (this.queue.length && this.queue[0].time <= now) cur = this.queue.shift();
      if (cur !== null && this.onStep) this.onStep(cur.step);
      this.raf = requestAnimationFrame(frame);
    };
    this.raf = requestAnimationFrame(frame);
  }

  tick() {
    const ctx = getCtx();
    const p = this.getProject();
    const total = p.bars * p.spb;
    while (this.nextTime < ctx.currentTime + LOOKAHEAD) {
      if (this.step >= total) this.step = 0;
      const t = this.nextTime + swingOffset(p, this.step);
      scheduleStep(p, this.channels, this.step, t, null);
      this.queue.push({ step: this.step, time: t });
      this.nextTime += stepSeconds(p);
      this.step++;
    }
  }

  stop() {
    this.playing = false;
    clearInterval(this.timer);
    cancelAnimationFrame(this.raf);
    this.queue = [];
    if (this.onStep) this.onStep(-1);
  }
}

// Play a project a fixed number of loops starting at t0 (used by ear drills).
// Returns the end time.
export function playPattern(p, channels, t0, loops = 1, muted = null) {
  const total = p.bars * p.spb;
  const sd = stepSeconds(p);
  for (let l = 0; l < loops; l++) {
    for (let s = 0; s < total; s++) {
      const t = t0 + (l * total + s) * sd + swingOffset(p, s);
      scheduleStep(p, channels, s, t, muted);
    }
  }
  return t0 + loops * total * sd;
}
