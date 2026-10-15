// Studio project model: 8 tracks, 1-8 bars, 16 (straight) or 12 (triplet) steps per bar.
// Chords are events on any step ({ s, r, b? }: step, roman numeral, optional slash bass).
// Bass notes are stored at real bass pitch: semitones above the lowest home note on a 4-string bass.
import { mod12, parseRoman } from './theory.js';

export const MAX_BARS = 8;
export const VERSION = 2;

export const TRACK_DEFS = [
  { id: 'kick', name: 'Kick', kind: 'drum', voice: 'kick', layer: 'rhythm' },
  { id: 'snare', name: 'Snare', kind: 'drum', voice: 'snare', layer: 'rhythm' },
  { id: 'hat', name: 'Hats', kind: 'drum', voice: 'hat', layer: 'rhythm' },
  { id: 'perc', name: 'Perc', kind: 'drum', voice: 'openhat', layer: 'rhythm' },
  { id: 'bass', name: 'Bass', kind: 'bass', voice: 'sub', layer: 'bass', gate: 'legato' },
  { id: 'chords', name: 'Chords', kind: 'chords', voice: 'epiano', layer: 'harmony', gate: 'legato' },
  { id: 'pad', name: 'Pad', kind: 'chords', voice: 'pad', layer: 'texture', gate: 'legato', vol: 0.5 },
  { id: 'lead', name: 'Lead', kind: 'lead', voice: 'square', layer: 'melody', gate: 'normal', vol: 0.6 },
];

export const VOICES_BY_KIND = {
  drum: ['kick', '808', 'snare', 'clap', 'rim', 'hat', 'openhat', 'shaker', 'tom'],
  bass: ['sub', 'sawbass', 'pluckbass'],
  chords: ['epiano', 'organ', 'pluck', 'grit', 'pad', 'strings', 'choir', 'guitar'],
  lead: ['square', 'saw', 'flute', 'bell', 'guitar', 'pluck'],
};

// Range of rows in the lead grid, in semitones above its base note.
export const NOTE_RANGE = { lead: 24 };
export const BASE_MIDI = { lead: 60, chords: 53 };

// ---------- Bass tunings ----------
// Open strings low to high, as [name, MIDI]. Heavy music lives in the lower ones.
export const TUNINGS = {
  std: { label: 'E standard (E A D G)', strings: [['E', 28], ['A', 33], ['D', 38], ['G', 43]] },
  dropD: { label: 'Drop D (D A D G)', strings: [['D', 26], ['A', 33], ['D', 38], ['G', 43]] },
  half: { label: 'Half step down (Eb Ab Db Gb)', strings: [['Eb', 27], ['Ab', 32], ['Db', 37], ['Gb', 42]] },
  dStd: { label: 'D standard (D G C F)', strings: [['D', 26], ['G', 31], ['C', 36], ['F', 41]] },
  dropCs: { label: 'Drop C# (C# G# C# F#)', strings: [['C#', 25], ['G#', 32], ['C#', 37], ['F#', 42]] },
  dropC: { label: 'Drop C (C G C F)', strings: [['C', 24], ['G', 31], ['C', 36], ['F', 41]] },
  cStd: { label: 'C standard (C F Bb Eb)', strings: [['C', 24], ['F', 29], ['Bb', 34], ['Eb', 39]] },
  dropB: { label: 'Drop B (B F# B E)', strings: [['B', 23], ['F#', 30], ['B', 35], ['E', 40]] },
  adgc: { label: '4-string A D G C', strings: [['A', 21], ['D', 26], ['G', 31], ['C', 36]] },
  five: { label: '5-string (B E A D G)', strings: [['B', 23], ['E', 28], ['A', 33], ['D', 38], ['G', 43]] },
  fiveDown: { label: '5-string, whole step down (A D G C F)', strings: [['A', 21], ['D', 26], ['G', 31], ['C', 36], ['F', 41]] },
};
export const tuningOf = (p) => TUNINGS[p?.tuning] || TUNINGS.std;

// ---------- Bass at real pitch ----------
export const BASS_LOW = 28; // E1, the open E string (the anchor for stored notes)
export const bassBase = (key) => BASS_LOW + mod12(key - 4); // the stored 0: lowest home note at or above E1
export const bassMidi = (p, v) => bassBase(p.key) + v;
const lowest = (p) => tuningOf(p).strings[0][1];
const highest = (p, frets) => tuningOf(p).strings[tuningOf(p).strings.length - 1][1] + frets;
// Row range for the bass grid: everything reachable in this tuning (semitones relative to bassBase).
export const bassRange = (p, frets = 20) => [lowest(p) - bassBase(p.key), highest(p, frets) - bassBase(p.key)];
// The lowest playable note of a pitch class in this tuning, as a stored value.
export const lowestOf = (p, semiFromKey) => lowest(p) + mod12(p.key + semiFromKey - lowest(p)) - bassBase(p.key);

// Old projects stored bass relative to C2 + key, an octave above a real bass.
// Move each note down an octave into the real register (where it still fits).
function legacyBass(v, key, octave = 0) {
  const old = 36 + key + v + octave * 12;
  const real = old - 12 >= BASS_LOW ? old - 12 : old;
  return real - bassBase(key);
}

export const isMelodic = (t) => t.kind === 'bass' || t.kind === 'lead';
export const emptyStep = (t) => (isMelodic(t) ? null : 0);
// Melodic steps hold a semitone (0 is a real note); drum/chord steps hold a velocity.
export const hasHit = (t, v) => (isMelodic(t) ? v !== null && v !== undefined : !!v);

const barChords = (list, bars, spb) => Array.from({ length: bars }, (_, i) => ({ s: i * spb, r: list[i % list.length] }));

export function newProject(opts = {}) {
  const bars = opts.bars || 1;
  const spb = opts.spb || 16;
  const p = {
    v: VERSION,
    name: opts.name || 'Untitled',
    bpm: opts.bpm || 96,
    key: opts.key ?? 0,
    mode: opts.mode || 'major',
    bars,
    spb,
    swing: opts.swing || 0,
    tuning: opts.tuning || 'std',
    chords: barChords(opts.chords || ['I'], bars, spb),
    fingering: {},
    tracks: TRACK_DEFS.map((d) => ({
      id: d.id,
      name: d.name,
      kind: d.kind,
      voice: d.voice,
      layer: d.layer,
      steps: Array(bars * spb).fill(d.kind === 'bass' || d.kind === 'lead' ? null : 0),
      vol: d.vol ?? 0.8,
      cutoff: 1,
      reverb: d.kind === 'chords' || d.kind === 'lead' ? 0.2 : 0,
      pan: 0,
      mute: false,
      solo: false,
      duck: false,
      gate: d.gate || 'normal',
      octave: 0,
    })),
  };
  return p;
}

// ---------- Chord events ----------
export function sortChords(p) {
  const total = p.bars * p.spb;
  const byStep = new Map();
  for (const e of p.chords) if (e.s >= 0 && e.s < total && parseRoman(e.r)) byStep.set(e.s, e);
  p.chords = [...byStep.values()].sort((a, b) => a.s - b.s);
  if (!p.chords.length) p.chords = [{ s: 0, r: 'I' }];
  if (p.chords[0].s !== 0) p.chords.unshift({ ...p.chords[p.chords.length - 1], s: 0 });
  return p;
}

// The chord sounding at a step.
export function chordAt(p, step) {
  let cur = p.chords[0];
  for (const e of p.chords) { if (e.s <= step) cur = e; else break; }
  return cur;
}

// The chord after the one sounding at a step (wraps to the start of the loop).
export function nextChord(p, step) {
  const cur = chordAt(p, step);
  const i = p.chords.indexOf(cur);
  return p.chords[(i + 1) % p.chords.length];
}

// Where each chord sits inside one bar: [{ start, end, ev, carried }] in steps within the bar.
export function chordSegments(p, bar) {
  const from = bar * p.spb, to = from + p.spb;
  const segs = [];
  const first = chordAt(p, from);
  let cur = { start: 0, ev: first, carried: first.s !== from };
  for (const e of p.chords) {
    if (e.s <= from || e.s >= to) continue;
    segs.push({ ...cur, end: e.s - from });
    cur = { start: e.s - from, ev: e, carried: false };
  }
  segs.push({ ...cur, end: p.spb });
  return segs;
}

// Bring an older saved project up to date.
export function migrate(p) {
  if (!p || p.v >= VERSION) return p;
  if (Array.isArray(p.chords) && typeof p.chords[0] === 'string') p.chords = barChords(p.chords, p.bars, p.spb);
  const bass = p.tracks.find((t) => t.id === 'bass');
  if (bass) {
    bass.steps = bass.steps.map((v) => (v === null || v === undefined ? null : legacyBass(v, p.key, bass.octave || 0)));
    bass.octave = 0;
  }
  p.fingering = p.fingering || {};
  p.v = VERSION;
  return sortChords(p);
}

// After a key change, keep every bass note on the neck.
export function fitBass(p, frets = 20) {
  const [lo, hi] = bassRange(p, frets);
  const bass = p.tracks.find((t) => t.id === 'bass');
  bass.steps = bass.steps.map((v) => {
    if (v === null || v === undefined) return null;
    while (v < lo) v += 12;
    while (v > hi) v -= 12;
    return v;
  });
}

export const clone = (o) => JSON.parse(JSON.stringify(o));

// Change bars / steps-per-bar while keeping the musical positions of notes.
// New bars copy the last existing bar (riffs repeat); removing bars trims the end.
export function resize(p, bars, spb) {
  const out = clone(p);
  bars = Math.max(1, Math.min(MAX_BARS, bars));
  out.bars = bars;
  out.spb = spb;
  out.swing = spb === 12 ? 0 : p.swing;
  // map an old step to the new grid (null if it doesn't land on a new step)
  const mapStep = (oldS) => {
    const bar = Math.floor(oldS / p.spb);
    const pos = ((oldS % p.spb) * spb) / p.spb;
    return Number.isInteger(pos) ? bar * spb + pos : null;
  };
  const srcBar = (bar) => (bar < p.bars ? bar : p.bars - 1);
  for (const t of out.tracks) {
    const src = p.tracks.find((x) => x.id === t.id).steps;
    const steps = Array(bars * spb).fill(emptyStep(t));
    for (let i = 0; i < bars * spb; i++) {
      const bar = Math.floor(i / spb);
      const oldInBar = ((i % spb) * p.spb) / spb;
      if (!Number.isInteger(oldInBar)) continue;
      steps[i] = src[srcBar(bar) * p.spb + oldInBar];
    }
    t.steps = steps;
  }
  const chords = [];
  for (let bar = 0; bar < bars; bar++) {
    const sb = srcBar(bar);
    for (const e of p.chords) {
      if (Math.floor(e.s / p.spb) !== sb) continue;
      const ns = mapStep(e.s);
      if (ns !== null) chords.push({ ...e, s: ns - sb * spb + bar * spb });
    }
  }
  // a copied bar starts with whatever chord was sounding at the start of the last bar
  if (bars > p.bars) {
    const carry = chordAt(p, (p.bars - 1) * p.spb);
    for (let bar = p.bars; bar < bars; bar++) if (!chords.some((e) => e.s === bar * spb)) chords.push({ ...carry, s: bar * spb });
  }
  out.chords = chords;
  out.fingering = {};
  return sortChords(out);
}

// ---------- Compact sketch notation (how song sketches are authored) ----------
// Drums: "x...x...x...x..." (x hit, o ghost, . rest). Spaces are ignored.
// Melodic: "0 . . 7 . . 5 ." — semitones above the key tonic, '.' rest.
// (Bass sketches are written in the old register and moved down onto the neck.)
// Chords track hits use the drum notation. Patterns repeat to fill the loop.
export function fromSketch(s) {
  const p = newProject({ bars: s.bars, spb: s.spb, bpm: s.bpm, key: s.key, mode: s.mode, swing: s.swing, chords: s.chords, name: s.name, tuning: s.tuning });
  const total = p.bars * p.spb;
  for (const t of p.tracks) {
    const def = s.tracks?.[t.id];
    if (!def) continue;
    const { p: pat, ...rest } = def;
    Object.assign(t, rest);
    if (!pat) continue;
    const tokens = isMelodic(t) ? pat.trim().split(/\s+/) : pat.replace(/\s+/g, '').split('');
    for (let i = 0; i < total; i++) {
      const tok = tokens[i % tokens.length];
      if (isMelodic(t)) t.steps[i] = tok === '.' ? null : Number(tok);
      else t.steps[i] = tok === 'x' ? 1 : tok === 'o' ? 0.5 : 0;
    }
    if (t.kind === 'bass') {
      t.steps = t.steps.map((v) => (v === null ? null : legacyBass(v, p.key, t.octave || 0)));
      t.octave = 0;
    }
  }
  return p;
}

// How long a note at step s should sound, in steps.
export function gateSteps(track, s, total, wrap = true) {
  if (track.gate === 'short') return 0.45;
  if (track.gate !== 'legato') return 0.9;
  for (let d = 1; d <= total; d++) {
    const j = s + d;
    if (!wrap && j >= total) return (total - s) * 0.98;
    if (hasHit(track, track.steps[j % total])) return d * 0.98;
  }
  return total * 0.98;
}

export function audibleTracks(p) {
  const anySolo = p.tracks.some((t) => t.solo);
  return p.tracks.filter((t) => (anySolo ? t.solo : !t.mute));
}
