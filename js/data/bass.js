// Bass Lab lessons. One loop per lesson; each variant swaps only the bass so you hear exactly what the bass does.
import { parseRoman } from '../theory.js';

// Template tokens, one per step, applied per bar:
// R root · 3 chord's 3rd · 5 fifth · 7 chord's 7th (b7 on triads) · O octave
// A approach: a half step below the next bar's root · N next bar's root (anticipation) · . rest · any number = semitones above the key
export function bassFrom(chords, tmpl) {
  const toks = tmpl.trim().split(/\s+/);
  const fit = (n) => { while (n > 19) n -= 12; while (n < 0) n += 12; return n; };
  return chords.map((r, i) => {
    const c = parseRoman(r);
    const ints = c.ints;
    const next = parseRoman(chords[(i + 1) % chords.length]).semi;
    return toks.map((t) => {
      if (t === '.') return '.';
      const n = { R: c.semi, 3: c.semi + ints[1], 5: c.semi + 7, 7: c.semi + (ints[3] ?? 10), O: c.semi + 12, A: next - 1, N: next }[t];
      return String(fit(n ?? Number(t)));
    }).join(' ');
  }).join(' ');
}

const CHORDS = ['I', 'V', 'vi', 'IV'];
const DRUMS = {
  kick: { p: 'x.....x...x..x..' },
  snare: { p: '....x.......x...' },
  hat: { p: 'x.x.x.x.x.x.x.x.', vol: 0.35 },
};
const KEYS = { p: 'x.......x.......', voice: 'epiano', vol: 0.45 };
const base = (over = {}) => ({ bpm: 96, key: 4, mode: 'major', bars: 4, spb: 16, swing: 0, chords: CHORDS, ...over });
const bass = (tmpl, extra = {}, chords = CHORDS) => ({ p: bassFrom(chords, tmpl), voice: 'sawbass', gate: 'legato', ...extra });

export const BASS_LESSONS = [
  {
    id: 'roots',
    title: 'The root names the chord',
    idea: 'With no bass, chords float. Put the root underneath and each chord suddenly has weight and a clear name. The bass is the floor everyone else stands on. That is your first job in the band: whoever is soloing, the room hears your note as the chord.',
    band: 'At rehearsal, play only whole-note roots through one verse. Notice how much easier it is for the singer and guitarist to lock in, then notice how much you want to add. Earn every extra note.',
    loop: base(),
    variants: [
      { label: 'No bass', what: 'Drums and keys only. The chords are there, but nothing holds them down.', tracks: {} },
      { label: 'Roots', what: 'One long root per chord. Same chords, now with a floor.', tracks: { bass: bass('R . . . . . . . . . . . . . . .') } },
    ],
  },
  {
    id: 'kick',
    title: 'Lock with the kick',
    idea: 'The kick drum and the bass are one instrument split across two players. When your notes start where the kick hits, the low end punches as a unit; drummers call it the pocket. When you play against the kick it can groove too, but it is a choice. Anticipating the next chord by an eighth note (pushing) adds forward momentum, very common in pop-punk and rock.',
    band: 'Watch your drummer\'s kick foot for one song and play only when it plays. Then try pushing the chord changes an eighth early on the last chorus.',
    loop: base(),
    variants: [
      { label: 'Locked', what: 'Bass notes start exactly on every kick (steps 1, 7, 11, 14).', tracks: { bass: bass('R . . . . . R . . . R . . R . .', { gate: 'normal' }) } },
      { label: 'Against', what: 'The bass fills the gaps between kicks. Busier, bouncier, less punch.', tracks: { bass: bass('. . R . R . . . R . . . R . . R', { gate: 'normal' }) } },
      { label: 'Pushed', what: 'Locked, but the next chord\'s root arrives an eighth early, on the "and" of 4.', tracks: { bass: bass('R . . . . . R . . . R . . R N .', { gate: 'normal' }) } },
    ],
  },
  {
    id: 'tones',
    title: 'Chord tones: root, 5th, 3rd, octave',
    idea: 'Beyond the root, the safest notes are the other chord tones. The 5th is strong and neutral; it never clashes. The octave adds energy without changing anything. The 3rd is the most colourful because it decides major vs minor, so use it on purpose. Watch the labels: they show what each note is doing under the chord.',
    band: 'Pick one song and play root–5th the whole way through, then root–3rd–5th arpeggios. Which one does the song want?',
    loop: base({ tracks: { ...DRUMS, kick: { p: 'x.......x.......' } } }),
    variants: [
      { label: 'Root only', what: 'Two roots per bar.', tracks: { bass: bass('R . . . . . . . R . . . . . . .', { gate: 'normal' }) } },
      { label: 'Root–5th', what: 'Root on beat 1, 5th on beat 3. Country, rock, pop.', tracks: { bass: bass('R . . . . . . . 5 . . . . . . .', { gate: 'normal' }) } },
      { label: 'Arpeggio', what: 'Root, 3rd, 5th, octave on the beats. Spells the chord out loud.', tracks: { bass: bass('R . . . 3 . . . 5 . . . O . . .', { gate: 'normal' }) } },
      { label: 'Octaves', what: 'Root and octave bouncing in 8ths. Disco and dance energy from a single note name.', tracks: { bass: bass('R . O . R . O . R . O . R . O .', { gate: 'short' }) } },
    ],
  },
  {
    id: 'approach',
    title: 'Approach notes & walk-ups',
    idea: 'The note right before a chord change is the most expressive one you play. A note a half step below the next root (the → label) leans into the change and makes it feel inevitable. Approach notes can be outside the key and still sound right, because they resolve immediately.',
    band: 'Keep your roots, but on the last 8th before each chord change play one fret below the next root. Do it only into the chorus at first.',
    loop: base(),
    variants: [
      { label: 'Roots', what: 'Plain roots. Changes just happen.', tracks: { bass: bass('R . . . . . R . . . R . . . . .', { gate: 'normal' }) } },
      { label: 'Chromatic', what: 'One half step below the next root at the end of each bar.', tracks: { bass: bass('R . . . . . R . . . R . . . A .', { gate: 'normal' }) } },
      { label: 'Walk', what: 'Up through the chord tones, then a half step into the next root.', tracks: { bass: bass('R . . . 3 . . . 5 . . . A . . .', { gate: 'normal' }) } },
    ],
  },
  {
    id: 'rhythm',
    title: 'Rhythm is the genre',
    idea: 'Play the same roots with three different rhythms and you are in three different genres. Driving 8ths is punk and rock. Long held notes are ballads and atmospheric music. Syncopation with rests is funk and R&B. Where you leave space matters as much as where you play; the rests are part of the line.',
    band: 'Take the busiest bass part you play and cut it in half. Keep only the notes that line up with the kick and the chord changes. Listen to how the band breathes.',
    loop: base(),
    variants: [
      { label: 'Drive', what: 'Straight 8ths on the root. Pop-punk.', tracks: { bass: bass('R . R . R . R . R . R . R . R .', { gate: 'normal', voice: 'pluckbass' }) } },
      { label: 'Held', what: 'One note per bar. Ballad.', tracks: { bass: bass('R . . . . . . . . . . . . . . .', { voice: 'sub' }) } },
      { label: 'Syncopated', what: 'Off-beat 16ths, octave pops and rests. Funk.', tracks: { bass: bass('R . . R . . O . . R . . R . 5 .', { gate: 'short' }) } },
    ],
  },
  {
    id: 'underneath',
    title: 'The bass changes the chord',
    idea: 'Whatever note you play becomes the bottom of the chord, so you can change the chord without the guitarist moving. Hold one note while the chords change (a pedal) and you build tension. Walk down stepwise (E–D#–C#–B here) and the second chord becomes an inversion (B/D#), which sounds softer and makes the whole progression glide.',
    band: 'Ask the guitarist to loop four chords. Play roots, then hold the key note under all four, then find a stepwise line down. Same chords, three different songs.',
    loop: base({ chords: ['I', 'V', 'vi', 'V'] }),
    variants: [
      { label: 'Roots', what: 'E – B – C# – B. Solid, expected.', tracks: { bass: bass('R . . . . . R . . . R . . . . .', { gate: 'normal' }, ['I', 'V', 'vi', 'V']) } },
      { label: 'Pedal', what: 'E under everything. Tension builds and wants to release.', tracks: { bass: { p: '0 . . . . . 0 . . . 0 . . . . .', voice: 'sawbass', gate: 'normal' } } },
      { label: 'Descending', what: 'E – D# – C# – B. The 3rd of B in the bass makes a smooth line.', tracks: { bass: { p: '12 . . . . . 12 . . . 12 . . . . . 11 . . . . . 11 . . . 11 . . . . . 9 . . . . . 9 . . . 9 . . . . . 7 . . . . . 7 . . . 7 . . . . .', voice: 'sawbass', gate: 'normal' } } },
    ],
  },
  {
    id: 'register',
    title: 'Register & tone',
    idea: 'A bass note is a low fundamental (low E on a bass is about 41 Hz) plus overtones higher up. Phone and laptop speakers can\'t reproduce the fundamental, so they only play the overtones. That is why a bass with some grit and mids (700 Hz–1 kHz) cuts through, and a pure sub disappears on small speakers but shakes a club. Watch the Studio spectrum while you switch.',
    band: 'Try your tone with the tone knob rolled off, then full, then picking near the bridge. Which one can you still hear when the guitars are loud?',
    loop: base(),
    variants: [
      { label: 'Sub', what: 'Pure sine, one octave down. Felt more than heard. Try it on headphones vs your phone speaker.', tracks: { bass: bass('R . . . 5 . . . O . . . 5 . . .', { voice: 'sub', octave: -1 }) } },
      { label: 'Growl', what: 'Saw wave with a filter: lots of mid-range harmonics.', tracks: { bass: bass('R . . . 5 . . . O . . . 5 . . .', { voice: 'sawbass' }) } },
      { label: 'Pick', what: 'Bright pluck with a fast filter snap: the attack of a pick.', tracks: { bass: bass('R . . . 5 . . . O . . . 5 . . .', { voice: 'pluckbass', gate: 'normal' }) } },
    ],
  },
];

export function lessonSketch(lesson, variant) {
  const loopTracks = lesson.loop.tracks || DRUMS;
  const chords = variant.chords || lesson.loop.chords;
  return {
    ...lesson.loop,
    chords,
    bars: chords.length,
    name: `${lesson.title}: ${variant.label}`,
    tracks: { ...loopTracks, chords: KEYS, ...variant.tracks },
  };
}
