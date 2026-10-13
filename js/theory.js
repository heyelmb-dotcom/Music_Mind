// Music theory core: notes, scales, chords, roman numerals.
// Roman numerals are always measured against the MAJOR scale of the key
// (so in a minor key you'll see i, iv, bVI, bVII). One system, every genre.

export const NOTE_NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

export const SCALES = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  harmonicMinor: [0, 2, 3, 5, 7, 8, 11],
};

export const SCALE_LABELS = {
  major: 'Major (Ionian)',
  minor: 'Minor (Aeolian)',
  dorian: 'Dorian',
  mixolydian: 'Mixolydian',
  phrygian: 'Phrygian',
  lydian: 'Lydian',
  harmonicMinor: 'Harmonic minor',
};

const MAJOR = SCALES.major;
const NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

// How each chromatic step above the tonic is spelled as a roman root.
const SEMI_TO_ROOT = [
  ['', 'I'], ['b', 'II'], ['', 'II'], ['b', 'III'], ['', 'III'], ['', 'IV'],
  ['#', 'IV'], ['', 'V'], ['b', 'VI'], ['', 'VI'], ['b', 'VII'], ['', 'VII'],
];

// lower: written with a lowercase numeral. rsuf: roman suffix. sym: chord-symbol suffix.
export const QUALITIES = {
  maj: { ints: [0, 4, 7], lower: false, rsuf: '', sym: '', label: 'Major' },
  min: { ints: [0, 3, 7], lower: true, rsuf: '', sym: 'm', label: 'Minor' },
  dim: { ints: [0, 3, 6], lower: true, rsuf: '°', sym: 'dim', label: 'Diminished' },
  aug: { ints: [0, 4, 8], lower: false, rsuf: '+', sym: 'aug', label: 'Augmented' },
  sus2: { ints: [0, 2, 7], lower: false, rsuf: 'sus2', sym: 'sus2', label: 'Sus2' },
  sus4: { ints: [0, 5, 7], lower: false, rsuf: 'sus4', sym: 'sus4', label: 'Sus4' },
  maj7: { ints: [0, 4, 7, 11], lower: false, rsuf: 'maj7', sym: 'maj7', label: 'Major 7' },
  dom7: { ints: [0, 4, 7, 10], lower: false, rsuf: '7', sym: '7', label: 'Dominant 7' },
  min7: { ints: [0, 3, 7, 10], lower: true, rsuf: '7', sym: 'm7', label: 'Minor 7' },
  minmaj7: { ints: [0, 3, 7, 11], lower: true, rsuf: 'maj7', sym: 'm(maj7)', label: 'Minor-major 7' },
  hdim7: { ints: [0, 3, 6, 10], lower: true, rsuf: 'ø7', sym: 'm7b5', label: 'Half-diminished 7' },
  dim7: { ints: [0, 3, 6, 9], lower: true, rsuf: '°7', sym: 'dim7', label: 'Diminished 7' },
  add9: { ints: [0, 4, 7, 14], lower: false, rsuf: 'add9', sym: 'add9', label: 'Add 9' },
};

export const INTERVALS = [
  { semi: 0, short: 'P1', name: 'Unison' },
  { semi: 1, short: 'm2', name: 'Minor 2nd' },
  { semi: 2, short: 'M2', name: 'Major 2nd' },
  { semi: 3, short: 'm3', name: 'Minor 3rd' },
  { semi: 4, short: 'M3', name: 'Major 3rd' },
  { semi: 5, short: 'P4', name: 'Perfect 4th' },
  { semi: 6, short: 'TT', name: 'Tritone' },
  { semi: 7, short: 'P5', name: 'Perfect 5th' },
  { semi: 8, short: 'm6', name: 'Minor 6th' },
  { semi: 9, short: 'M6', name: 'Major 6th' },
  { semi: 10, short: 'm7', name: 'Minor 7th' },
  { semi: 11, short: 'M7', name: 'Major 7th' },
  { semi: 12, short: 'P8', name: 'Octave' },
];

export const mod12 = (n) => ((n % 12) + 12) % 12;
export const midiToFreq = (m) => 440 * Math.pow(2, (m - 69) / 12);
export const noteName = (midi) => NOTE_NAMES[mod12(midi)] + (Math.floor(midi / 12) - 1);
export const pcName = (pc) => NOTE_NAMES[mod12(pc)];

export function qualityFromInts(ints) {
  const key = ints.join(',');
  for (const [q, def] of Object.entries(QUALITIES)) if (def.ints.join(',') === key) return q;
  return null;
}

export function romanFor(semi, quality) {
  const [acc, num] = SEMI_TO_ROOT[mod12(semi)];
  const q = QUALITIES[quality];
  return acc + (q.lower ? num.toLowerCase() : num) + q.rsuf;
}

const ROMAN_RE = /^([b#]?)(VII|VI|IV|V|III|II|I|vii|vi|iv|v|iii|ii|i)(.*)$/;
const UPPER_SUF = { '': 'maj', '+': 'aug', maj7: 'maj7', '7': 'dom7', sus2: 'sus2', sus4: 'sus4', add9: 'add9' };
const LOWER_SUF = { '': 'min', '°': 'dim', o: 'dim', '7': 'min7', 'ø7': 'hdim7', '°7': 'dim7', o7: 'dim7', maj7: 'minmaj7' };

// "bVII" -> { semi: 10, quality: 'maj', roman: 'bVII' }
export function parseRoman(str) {
  if (!str) return null;
  const m = String(str).trim().match(ROMAN_RE);
  if (!m) return null;
  const [, acc, num, suf] = m;
  const upper = num === num.toUpperCase();
  const quality = (upper ? UPPER_SUF : LOWER_SUF)[suf];
  if (!quality) return null;
  const deg = NUMERALS.indexOf(num.toUpperCase());
  const semi = mod12(MAJOR[deg] + (acc === 'b' ? -1 : acc === '#' ? 1 : 0));
  return { semi, quality, roman: romanFor(semi, quality) };
}

export function chordSymbol(roman, keyPc) {
  const c = parseRoman(roman);
  if (!c) return '?';
  return pcName(keyPc + c.semi) + QUALITIES[c.quality].sym;
}

// Close-voiced chord placed in a window starting at `low` (MIDI).
export function chordMidi(roman, keyPc, low = 55) {
  const c = parseRoman(roman);
  if (!c) return [];
  const rootPc = mod12(keyPc + c.semi);
  return QUALITIES[c.quality].ints
    .map((i) => {
      let n = low + mod12(rootPc + i - low);
      if (i >= 12) n += 12;
      return n;
    })
    .sort((a, b) => a - b);
}

export function chordRootPc(roman, keyPc) {
  const c = parseRoman(roman);
  return c ? mod12(keyPc + c.semi) : null;
}

// Diatonic chords built by stacking thirds inside the scale.
export function diatonicChords(mode = 'major', sevenths = false) {
  const sc = SCALES[mode] || MAJOR;
  return sc.map((root, d) => {
    const at = (k) => mod12(sc[(d + k) % 7] - root);
    const ints = sevenths ? [0, at(2), at(4), at(6)] : [0, at(2), at(4)];
    const q = qualityFromInts(ints);
    return q ? romanFor(root, q) : null;
  }).filter(Boolean);
}

// Common chords borrowed from outside the current scale.
export const BORROWED = ['bIII', 'iv', 'bVI', 'bVII', 'II', 'III', 'V', 'V7', 'bII', 'I', 'i'];

export function inScale(semi, mode) {
  return (SCALES[mode] || MAJOR).includes(mod12(semi));
}
