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
  pow: { ints: [0, 7], lower: false, rsuf: '5', sym: '5', label: 'Power chord (root + 5th)' },
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

const SHARPS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLATS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const MINOR_LIKE = { minor: 3, dorian: 10, phrygian: 8, harmonicMinor: 3, mixolydian: 5, lydian: 7, major: 0 };
// Spell a pitch class the way the key would: sharps in E major, flats in F major.
export function spell(pc, keyPc = 0, mode = 'major') {
  const relMajor = mod12(keyPc + (MINOR_LIKE[mode] ?? 0));
  const flatKey = [5, 10, 3, 8, 1].includes(relMajor);
  return (flatKey ? FLATS : relMajor === 0 ? NOTE_NAMES : SHARPS)[mod12(pc)];
}
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

// ---------- Chord suffixes ----------
// One grammar for both chord symbols ("Bbmaj9", "C#m7b5", "D7#9") and roman numerals
// ("IVmaj9", "ii7", "bVII5"). Returns semitones above the root (extensions above 12),
// or null if the suffix isn't a chord we understand.
export function parseSuffix(raw, lowerNumeral = false) {
  let s = String(raw).replace(/[()\s]/g, '').replace(/♭/g, 'b').replace(/♯/g, '#');
  const take = (re) => { const m = s.match(re); if (!m) return null; s = s.slice(m[0].length); return m; };
  let third = lowerNumeral ? 3 : 4, fifth = 7, seventh = null, majPending = false, dim = false, power = false;
  const add = new Set();
  if (take(/^(mMaj|mmaj|minmaj|minMaj|mΔ|-Δ|-maj)/)) { third = 3; majPending = true; }
  else if (take(/^(maj|Maj|MA|ma|M)/)) majPending = true;
  else if (take(/^Δ/)) { majPending = true; seventh = 11; }
  else if (take(/^(ø|Ø)/)) { third = 3; fifth = 6; seventh = 10; }
  else if (take(/^(dim|°|o)/)) { third = 3; fifth = 6; dim = true; }
  else if (take(/^(min|m|-)/)) third = 3;
  else if (take(/^(aug|\+)/)) fifth = 8;
  const sev = () => (majPending ? 11 : dim ? 9 : 10);
  const num = take(/^(13|11|9|7|6\/9|69|6|5|4|2)/);
  if (num) {
    const n = num[0];
    if (n === '5') { if (third !== 4 || majPending) return null; power = true; }
    else if (n === '6') add.add(9);
    else if (n === '69' || n === '6/9') { add.add(9); add.add(14); }
    else if (n === '4') third = 5;
    else if (n === '2') add.add(2);
    else {
      seventh = seventh ?? sev();
      if (n === '7' && dim && !majPending) seventh = 9;
      if (n !== '7') add.add(14);
      if (n === '11' || n === '13') add.add(17);
      if (n === '13') add.add(21);
    }
  }
  while (s.length) {
    let m;
    if ((m = take(/^sus(2|4)?/))) third = m[1] === '2' ? 2 : 5;
    else if ((m = take(/^add(b9|#9|#11|13|11|9|4|2)/))) add.add({ b9: 13, '#9': 15, '#11': 18, 13: 21, 11: 17, 9: 14, 4: 5, 2: 2 }[m[1]]);
    else if ((m = take(/^(b5|-5)/))) fifth = 6;
    else if ((m = take(/^(#5|\+5)/))) fifth = 8;
    else if ((m = take(/^(b9|-9)/))) { add.delete(14); add.add(13); }
    else if ((m = take(/^(#9|\+9)/))) { add.delete(14); add.add(15); }
    else if ((m = take(/^(#11|\+11)/))) { add.delete(17); add.add(18); }
    else if ((m = take(/^(b13|-13)/))) { add.delete(21); add.add(20); }
    else if ((m = take(/^alt/))) { seventh = seventh ?? 10; add.add(13); add.add(15); add.add(20); }
    else return null;
  }
  const ints = power ? [0, 7] : [0, third, fifth];
  if (seventh !== null) ints.push(seventh);
  ints.push(...add);
  return [...new Set(ints)].sort((a, b) => a - b);
}

// "bVII" -> { semi: 10, ints: [0,4,7], quality: 'maj', roman: 'bVII', lower: false, suffix: '' }
export function parseRoman(str) {
  if (!str) return null;
  const m = String(str).trim().match(ROMAN_RE);
  if (!m) return null;
  const [, acc, num, suf] = m;
  const lower = num !== num.toUpperCase();
  const ints = parseSuffix(suf, lower);
  if (!ints) return null;
  const deg = NUMERALS.indexOf(num.toUpperCase());
  const semi = mod12(MAJOR[deg] + (acc === 'b' ? -1 : acc === '#' ? 1 : 0));
  const [racc, rnum] = SEMI_TO_ROOT[semi];
  return { semi, ints, quality: qualityFromInts(ints), lower, suffix: suf, roman: racc + (lower ? rnum.toLowerCase() : rnum) + suf };
}

// The symbol suffix for a roman chord: lowercase numerals become "m…".
function symbolSuffix(c) {
  const suf = c.suffix;
  if (!c.lower) return suf;
  if (/^(°|o|dim)/.test(suf)) return 'dim' + suf.replace(/^(°|o|dim)/, '');
  if (/^(ø|Ø)/.test(suf)) return 'm7b5' + suf.replace(/^(ø|Ø)7?/, '');
  if (/^(maj|M|Δ)/.test(suf)) return 'm(' + suf + ')';
  return 'm' + suf;
}

// sp: '#' or 'b' to force sharps/flats (keeps a typed "F#5" as F#, not Gb).
export function chordSymbol(roman, keyPc, mode = 'major', bass = null, sp = null) {
  const c = parseRoman(roman);
  if (!c) return '?';
  const name = (pc) => (sp === '#' ? SHARPS : sp === 'b' ? FLATS : null)?.[mod12(pc)] ?? spell(pc, keyPc, mode);
  const sym = name(keyPc + c.semi) + symbolSuffix(c);
  return bass === null || bass === undefined ? sym : sym + '/' + name(keyPc + bass);
}

// Every note of the chord, spelled in the key ("Bb D F Ab C Eb G").
// Spelled from the chord's own root, so D7#9 reads D F# A C F rather than borrowing the key's flats.
const DEGREE_OF = { 0: 1, 2: 2, 3: 3, 4: 3, 5: 4, 6: 5, 7: 5, 8: 5, 9: 6, 10: 7, 11: 7, 13: 9, 14: 9, 15: 9, 17: 11, 18: 11, 20: 13, 21: 13 };
const LETTERS = 'CDEFGAB';
function spellFrom(rootName, i, ints = []) {
  // in a diminished 7th chord the 9-semitone note is a double-flat 7th, not a 6th
  const deg = i === 9 && ints.includes(6) && !ints.includes(10) && !ints.includes(11) ? 7 : DEGREE_OF[i] ?? 1;
  const letter = LETTERS[(LETTERS.indexOf(rootName[0]) + deg - 1) % 7];
  const rootPc = LETTER_PC[rootName[0]] + (rootName.includes('#') ? 1 : rootName.includes('b') ? -1 : 0);
  const diff = mod12(rootPc + i - LETTER_PC[letter]);
  return letter + ({ 0: '', 1: '#', 2: '##', 11: 'b', 10: 'bb' }[diff] ?? '?');
}

export function chordTones(roman, keyPc, mode = 'major') {
  const c = parseRoman(roman);
  if (!c) return [];
  const root = spell(keyPc + c.semi, keyPc, mode);
  return c.ints.map((i) => (DEGREE_OF[i] ? spellFrom(root, i, c.ints) : spell(keyPc + c.semi + i, keyPc, mode)));
}

// Typed chord -> { r: roman, b: slash bass (semitones above the key) or undefined }.
// Accepts symbols (Ebmaj9, C#m7b5, F/A) or roman numerals (bVII7).
export function parseChordInput(text, keyPc) {
  let t = String(text || '').trim().replace(/♭/g, 'b').replace(/♯/g, '#');
  if (!t) return null;
  let b;
  const sp = (t.match(/^[A-G]([#b])/) || [])[1] || null; // remember how you spelled it
  const slash = t.match(/^(.+)\/([A-G])([#b]?)$/);
  if (slash) {
    t = slash[1];
    b = mod12(LETTER_PC[slash[2]] + (slash[3] === '#' ? 1 : slash[3] === 'b' ? -1 : 0) - keyPc);
  }
  if (parseRoman(t)) return { r: parseRoman(t).roman, b };
  const withSp = (o) => (sp ? { ...o, sp } : o);
  const m = t.match(/^([A-G])([#b]?)(.*)$/);
  if (!m) return null;
  const ints = parseSuffix(m[3], false);
  if (!ints) return null;
  const semi = mod12(LETTER_PC[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) - keyPc);
  const [acc, num] = SEMI_TO_ROOT[semi];
  // Prefer the lowercase-numeral spelling for minor-family chords (ii7 rather than IIm7).
  const minorish = ints.includes(3) && !ints.includes(4);
  if (minorish) {
    const lowSuf = m[3].replace(/^(m7b5)/, 'ø7').replace(/^(dim)/, '°').replace(/^(min|m(?!aj)|-)/, '');
    const cand = acc + num.toLowerCase() + lowSuf;
    const pc = parseRoman(cand);
    if (pc && pc.ints.join() === ints.join()) return withSp({ r: pc.roman, b });
  }
  const cand = acc + num + m[3];
  return parseRoman(cand) ? withSp({ r: parseRoman(cand).roman, b }) : null;
}
const LETTER_PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

// Playback voicing: the core of the chord close-voiced in a window from `low`,
// extensions stacked above. Notes that clash or crowd are left out: the natural 11
// in a 13 chord, the 3rd under a dominant 11, and the 5th when there are too many notes.
export function chordMidi(roman, keyPc, low = 55) {
  const c = parseRoman(roman);
  if (!c) return [];
  let ints = [...c.ints];
  const has = (i) => ints.includes(i);
  if (has(21) || has(20)) ints = ints.filter((i) => i !== 17);
  if (has(17) && has(4)) ints = ints.filter((i) => i !== 4);
  if (ints.length > 5) ints = ints.filter((i) => i !== 7);
  while (ints.length > 5) ints.splice(ints.findIndex((i) => i >= 12 && i !== Math.max(...ints)), 1);
  const rootPc = mod12(keyPc + c.semi);
  const core = ints.filter((i) => i < 12).map((i) => low + mod12(rootPc + i - low)).sort((a, b) => a - b);
  const top = Math.max(...core);
  const ext = ints.filter((i) => i >= 12).map((i) => {
    let n = top + mod12(rootPc + i - top);
    if (n <= top) n += 12;
    return n;
  });
  return [...core, ...ext].sort((a, b) => a - b);
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

// What job a bass note is doing under a chord: R, 3, 5, b7… or → (approach into the next chord).
const ROLE_NAMES = ['R', '♭2', '2', '♭3', '3', '4', '♭5', '5', '♭6', '6', '♭7', '7'];
export function bassRole(bassSemi, roman, nextRoman) {
  const c = parseRoman(roman);
  if (!c) return '?';
  const iv = mod12(bassSemi - c.semi);
  const tones = c.ints.map(mod12);
  if (tones.includes(iv) || iv === 0) return ROLE_NAMES[iv];
  const n = parseRoman(nextRoman);
  if (n && n.semi !== c.semi && (mod12(bassSemi + 1) === n.semi || mod12(bassSemi - 1) === n.semi)) return '→';
  return ROLE_NAMES[iv];
}

// Where a pitch class sits on a 4-string bass (E A D G), frets 0-12, lowest first.
const BASS_STRINGS = [['E', 4], ['A', 9], ['D', 2], ['G', 7]];
export function bassFrets(pc) {
  return BASS_STRINGS.map(([name, open]) => ({ string: name, fret: mod12(pc - open) }))
    .sort((a, b) => a.fret - b.fret);
}

// Both names for a black-key note ("Gb / F#"), so app spelling matches any tab you read.
export const bothNames = (pc) => [...new Set([FLATS[mod12(pc)], SHARPS[mod12(pc)]])].join(' / ');

// Scale degree of a note relative to the key's tonic, measured against the major scale
// (same convention as the roman numerals): 1 2 3 4 5 6 7, with b/# for anything else.
export const DEGREE_NAMES = ['1', 'b2', '2', 'b3', '3', '4', '#4', '5', 'b6', '6', 'b7', '7'];
export const degreeName = (semiFromTonic) => DEGREE_NAMES[mod12(semiFromTonic)];
