// Studio project model: 8 tracks, 1-4 bars, 16 (straight) or 12 (triplet) steps per bar.

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

// Range of rows in the note grid, in semitones above the track's base note.
export const NOTE_RANGE = { bass: 19, lead: 24 };
export const BASE_MIDI = { bass: 36, lead: 60, chords: 53 };

export const isMelodic = (t) => t.kind === 'bass' || t.kind === 'lead';
export const emptyStep = (t) => (isMelodic(t) ? null : 0);
// Melodic steps hold a semitone (0 is a real note); drum/chord steps hold a velocity.
export const hasHit = (t, v) => (isMelodic(t) ? v !== null && v !== undefined : !!v);

export function newProject(opts = {}) {
  const bars = opts.bars || 1;
  const spb = opts.spb || 16;
  const p = {
    name: opts.name || 'Untitled',
    bpm: opts.bpm || 96,
    key: opts.key ?? 0,
    mode: opts.mode || 'major',
    bars,
    spb,
    swing: opts.swing || 0,
    chords: Array.from({ length: bars }, (_, i) => (opts.chords || ['I'])[i % (opts.chords || ['I']).length]),
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

export const clone = (o) => JSON.parse(JSON.stringify(o));

// Change bars / steps-per-bar while keeping the musical positions of notes.
export function resize(p, bars, spb) {
  const out = clone(p);
  const oldTotal = p.bars * p.spb;
  out.bars = bars;
  out.spb = spb;
  out.chords = Array.from({ length: bars }, (_, i) => p.chords[i % p.chords.length]);
  out.swing = spb === 12 ? 0 : p.swing;
  for (const t of out.tracks) {
    const src = p.tracks.find((x) => x.id === t.id).steps;
    const steps = Array(bars * spb).fill(emptyStep(t));
    for (let i = 0; i < bars * spb; i++) {
      const bar = Math.floor(i / spb);
      const inBar = i % spb;
      // only map steps that land exactly on an old step position
      const oldInBar = (inBar * p.spb) / spb;
      if (!Number.isInteger(oldInBar)) continue;
      const oldIdx = ((bar % p.bars) * p.spb + oldInBar) % oldTotal;
      steps[i] = src[oldIdx];
    }
    t.steps = steps;
  }
  return out;
}

// ---------- Compact sketch notation (how song sketches are authored) ----------
// Drums: "x...x...x...x..." (x hit, o ghost, . rest). Spaces are ignored.
// Melodic: "0 . . 7 . . 5 ." — semitones above the key tonic, '.' rest.
// Chords track hits use the drum notation. Patterns repeat to fill the loop.
export function fromSketch(s) {
  const p = newProject({ bars: s.bars, spb: s.spb, bpm: s.bpm, key: s.key, mode: s.mode, swing: s.swing, chords: s.chords, name: s.name });
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
