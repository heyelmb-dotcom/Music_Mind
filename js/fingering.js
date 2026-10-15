// Where to play each bass note on the neck, in the project's tuning.
// The same pitch often lives in two or three places; by default we pick the spot
// closest to where the hand already is (how bassists actually finger lines), and
// any note can be overridden by hand, saved with the project as "stringIndex:fret".
import { bassMidi, tuningOf } from './project.js';

// strings: [[name, openMidi], …] low to high
export function positionsFor(midi, frets = 20, strings = tuningOf(null).strings) {
  return strings.map(([string, open], idx) => ({ string, idx, fret: midi - open })).filter((c) => c.fret >= 0 && c.fret <= frets);
}

export const posKey = (c) => `${c.idx}:${c.fret}`;

// step -> { string, idx, fret, midi } for every bass note in the project.
export function fingering(p, frets = 20) {
  const strings = tuningOf(p).strings;
  const bass = p.tracks.find((t) => t.id === 'bass');
  const out = new Map();
  let hand = null;
  bass.steps.forEach((v, s) => {
    if (v === null || v === undefined) return;
    const midi = bassMidi(p, v);
    const cands = positionsFor(midi, frets, strings);
    if (!cands.length) return;
    let pick = cands.find((c) => posKey(c) === p.fingering?.[s]);
    if (!pick) {
      const cost = (c) => {
        if (hand === null) return c.fret;
        if (c.fret === 0) return hand > 4 ? 2.5 : 0.5; // open strings don't move the hand, but are a reach from high up
        return Math.abs(c.fret - hand);
      };
      pick = [...cands].sort((a, b) => cost(a) - cost(b) || a.fret - b.fret)[0];
    }
    if (pick.fret > 0) hand = pick.fret;
    out.set(s, { ...pick, midi });
  });
  return out;
}

// Move one note to the next place that pitch can be played.
export function cycleFingering(p, step, frets = 20) {
  const cur = fingering(p, frets).get(step);
  if (!cur) return;
  const cands = positionsFor(cur.midi, frets, tuningOf(p).strings);
  const i = cands.findIndex((c) => posKey(c) === posKey(cur));
  p.fingering = p.fingering || {};
  p.fingering[step] = posKey(cands[(i + 1) % cands.length]);
}
