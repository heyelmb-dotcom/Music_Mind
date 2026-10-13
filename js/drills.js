// Ear drills: each one makes questions with a play() and a playOption() for comparing.
import { getCtx, trigger, freshBus, pinkNoise, createChannel } from './audio.js';
import { INTERVALS, QUALITIES, chordMidi, chordRootPc } from './theory.js';
import { fromSketch } from './project.js';
import { playPattern } from './sequencer.js';

const rand = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

async function begin() {
  const ctx = getCtx();
  if (ctx.state !== 'running') await ctx.resume();
  return { ctx, out: freshBus(), t: ctx.currentTime + 0.08 };
}

// ---------- Musical ears ----------
function playInterval(root, semi) {
  begin().then(({ t, out }) => {
    trigger('epiano', t, root, 0.55, 0.9, out);
    trigger('epiano', t + 0.6, root + semi, 0.55, 0.9, out);
    trigger('epiano', t + 1.3, root, 1.2, 0.8, out);
    trigger('epiano', t + 1.3, root + semi, 1.2, 0.8, out);
  });
}

function playChord(root, quality) {
  begin().then(({ t, out }) => {
    const notes = QUALITIES[quality].ints.map((i) => root + i);
    notes.forEach((n) => trigger('epiano', t, n, 1.3, 0.7, out));
    notes.forEach((n, i) => trigger('epiano', t + 1.6 + i * 0.28, n, 0.5, 0.75, out));
  });
}

export const PROGRESSIONS = {
  pop: { label: 'I – V – vi – IV', chords: ['I', 'V', 'vi', 'IV'] },
  sad: { label: 'vi – IV – I – V', chords: ['vi', 'IV', 'I', 'V'] },
  doowop: { label: 'I – vi – IV – V', chords: ['I', 'vi', 'IV', 'V'] },
  jazz: { label: 'ii – V – I', chords: ['ii7', 'V7', 'Imaj7', 'Imaj7'] },
  mixo: { label: 'I – bVII – IV – I', chords: ['I', 'bVII', 'IV', 'I'] },
  minorIV: { label: 'I – IV – iv – I', chords: ['I', 'IV', 'iv', 'I'] },
  aeolian: { label: 'i – bVI – bIII – bVII', chords: ['i', 'bVI', 'bIII', 'bVII'] },
  andalusian: { label: 'i – bVII – bVI – V', chords: ['i', 'bVII', 'bVI', 'V'] },
};

export function playProgression(chords, key, secPerChord = 1.0, voice = 'epiano') {
  return begin().then(({ t, out }) => {
    chords.forEach((r, i) => {
      const at = t + i * secPerChord;
      chordMidi(r, key, 55).forEach((n) => trigger(voice, at, n, secPerChord * 0.95, 0.55, out));
      const root = chordRootPc(r, key);
      if (root !== null) trigger('sub', at, 36 + root, secPerChord * 0.9, 0.8, out);
    });
  });
}

// ---------- Production ears ----------
export const BANDS = [
  { id: '60', f: 60, label: '60 Hz — sub' },
  { id: '150', f: 150, label: '150 Hz — body/thump' },
  { id: '400', f: 400, label: '400 Hz — boxy/mud' },
  { id: '1k', f: 1000, label: '1 kHz — nasal/honk' },
  { id: '3k', f: 3000, label: '3 kHz — presence/bite' },
  { id: '8k', f: 8000, label: '8 kHz — air/sizzle' },
];

export function playEq(freq, boosted = true, flatFirst = true) {
  begin().then(({ ctx, t, out }) => {
    const src = pinkNoise();
    const peq = ctx.createBiquadFilter();
    peq.type = 'peaking';
    peq.Q.value = 1.4;
    peq.frequency.value = freq;
    const g = ctx.createGain();
    const seg = 1.6;
    const start = flatFirst ? t + seg + 0.3 : t;
    g.gain.setValueAtTime(0, t);
    if (flatFirst) {
      peq.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.35, t + 0.03);
      g.gain.setValueAtTime(0.35, t + seg);
      g.gain.linearRampToValueAtTime(0, t + seg + 0.03);
    }
    peq.gain.setValueAtTime(boosted ? 12 : 0, start);
    g.gain.setValueAtTime(0, start);
    g.gain.linearRampToValueAtTime(0.35, start + 0.03);
    g.gain.setValueAtTime(0.35, start + seg);
    g.gain.linearRampToValueAtTime(0, start + seg + 0.05);
    src.connect(peq).connect(g).connect(out);
    src.start(t);
    src.stop(start + seg + 0.1);
  });
}

// Loops for the "what dropped out?" drill.
const DROP_LOOPS = [
  { bpm: 100, mode: 'major', chords: ['I', 'vi', 'IV', 'V'], bars: 1, spb: 16,
    tracks: {
      kick: { p: 'x.....x...x.....' }, snare: { p: '....x.......x...' }, hat: { p: 'x.x.x.x.x.x.x.x.' },
      bass: { p: '0 . . . . . 0 . . . 7 . . . . .' }, chords: { p: 'x.......x.......', voice: 'epiano' },
      lead: { p: '12 . . . 14 . 16 . . . 14 . 12 . . .', voice: 'square' },
    } },
  { bpm: 118, mode: 'minor', chords: ['i'], bars: 1, spb: 16,
    tracks: {
      kick: { p: 'x...x...x...x...' }, snare: { p: '....x.......x...', voice: 'clap' }, hat: { p: '..x...x...x...x.' },
      bass: { p: '0 . 0 . . . 0 . 0 . . . 3 . 5 .', voice: 'sawbass' }, chords: { p: 'x.......x.......', voice: 'pluck' },
      lead: { p: '7 . . 10 . . 12 . . . 10 . 7 . . .', voice: 'bell' },
    } },
];
const DROP_TRACKS = ['kick', 'snare', 'hat', 'bass', 'chords', 'lead'];
const DROP_LABELS = { kick: 'Kick', snare: 'Snare/Clap', hat: 'Hats', bass: 'Bass', chords: 'Chords', lead: 'Lead' };

function playLoop(sketch, key, muted, fullFirst) {
  begin().then(({ t, out }) => {
    const p = fromSketch({ ...sketch, key });
    const channels = {};
    for (const tr of p.tracks) {
      channels[tr.id] = createChannel(out);
      channels[tr.id].set(tr);
    }
    let at = t;
    if (fullFirst) at = playPattern(p, channels, at, 2) + 0.35;
    playPattern(p, channels, at, 2, muted ? new Set([muted]) : null);
  });
}

// ---------- Drill catalogue ----------
export const DRILLS = {
  intervals: {
    title: 'Intervals',
    side: 'musical',
    about: 'Two notes, one after the other, then together. Name the distance.',
    defaults: { set: ['m3', 'M3', 'P4', 'P5', 'P8'] },
    make({ set }) {
      const pool = INTERVALS.filter((i) => set.includes(i.short));
      const ans = pick(pool);
      const root = rand(52, 64);
      return {
        options: pool.map((i) => ({ id: i.short, label: i.name })),
        answer: ans.short,
        play: () => playInterval(root, ans.semi),
        playOption: (id) => playInterval(root, pool.find((i) => i.short === id).semi),
      };
    },
  },
  quality: {
    title: 'Chord quality',
    side: 'musical',
    about: 'A chord, then its notes one at a time. What colour is it?',
    defaults: { set: ['maj', 'min'] },
    make({ set }) {
      const q = pick(set);
      const root = rand(50, 60);
      return {
        options: set.map((id) => ({ id, label: QUALITIES[id].label })),
        answer: q,
        play: () => playChord(root, q),
        playOption: (id) => playChord(root, id),
      };
    },
  },
  progression: {
    title: 'Progressions',
    side: 'musical',
    about: 'Four chords with the bass on the root. Which progression is it? Listen to where the bass moves and whether chords feel bright or dark.',
    defaults: { set: ['pop', 'sad', 'doowop'] },
    make({ set }) {
      const id = pick(set);
      const key = rand(0, 11);
      return {
        options: set.map((s) => ({ id: s, label: PROGRESSIONS[s].label })),
        answer: id,
        play: () => playProgression(PROGRESSIONS[id].chords, key),
        playOption: (o) => playProgression(PROGRESSIONS[o].chords, key),
      };
    },
  },
  eq: {
    title: 'Frequency hunter',
    side: 'production',
    about: 'Pink noise plays flat, then with one band boosted by 12 dB. Which band? This is the map of every EQ move you will ever make.',
    defaults: { set: ['150', '1k', '8k'] },
    make({ set }) {
      const pool = BANDS.filter((b) => set.includes(b.id));
      const ans = pick(pool);
      return {
        options: pool.map((b) => ({ id: b.id, label: b.label })),
        answer: ans.id,
        play: () => playEq(ans.f),
        playOption: (id) => playEq(pool.find((b) => b.id === id).f, true, false),
        reference: () => playEq(1000, false, false),
      };
    },
  },
  dropout: {
    title: 'What dropped out?',
    side: 'production',
    about: 'A full loop plays twice, then again with one part removed. Which part is gone? Arrangement is mostly the art of taking things away.',
    defaults: { set: DROP_TRACKS },
    make({ set }) {
      const loop = pick(DROP_LOOPS);
      const key = rand(0, 11);
      const ans = pick(set);
      return {
        options: set.map((id) => ({ id, label: DROP_LABELS[id] })),
        answer: ans,
        play: () => playLoop(loop, key, ans, true),
        playOption: (id) => playLoop(loop, key, id, false),
        reference: () => playLoop(loop, key, null, false),
      };
    },
  },
};
