// Where to play each bass note on a 4-string neck.
// The same pitch often lives in two or three places; by default we pick the spot
// closest to where the hand already is (how bassists actually finger lines), and
// any note can be overridden by hand, saved with the project as "A:5".
import { bassMidi } from './project.js';

const OPEN = [['E', 28], ['A', 33], ['D', 38], ['G', 43]];

export function positionsFor(midi, frets = 20) {
  return OPEN.map(([string, open]) => ({ string, fret: midi - open })).filter((c) => c.fret >= 0 && c.fret <= frets);
}

const key = (c) => `${c.string}:${c.fret}`;

// step -> { string, fret, midi } for every bass note in the project.
export function fingering(p, frets = 20) {
  const bass = p.tracks.find((t) => t.id === 'bass');
  const out = new Map();
  let hand = null;
  bass.steps.forEach((v, s) => {
    if (v === null || v === undefined) return;
    const midi = bassMidi(p, v);
    const cands = positionsFor(midi, frets);
    if (!cands.length) return;
    let pick = cands.find((c) => key(c) === p.fingering?.[s]);
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
  const cands = positionsFor(cur.midi, frets);
  const i = cands.findIndex((c) => key(c) === key(cur));
  p.fingering = p.fingering || {};
  p.fingering[step] = key(cands[(i + 1) % cands.length]);
}
