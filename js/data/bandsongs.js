// Songs your band plays, broken into parts for the Bass Lab.
// These are WORKBENCHES, not finished transcriptions: where published tabs disagree,
// each candidate is a variant you check against the record.
import { bassFrom } from './bass.js';

const silent = { p: '.' };
const bass8 = (chords) => ({ p: bassFrom(chords, 'R . R . R . R . R . R . R . R .'), voice: 'pluckbass', gate: 'normal' });
const bassMap = (chords) => ({ p: bassFrom(chords, 'R . . . . . . . R . . . R . . .'), voice: 'sawbass', gate: 'normal' });
const guitar = { p: 'x.x.x.x.x.x.x.x.', voice: 'grit', gate: 'normal', vol: 0.45 };
const rock = { kick: { p: 'x.......x.x.....' }, snare: { p: '....x.......x...' }, hat: { p: 'x.x.x.x.x.x.x.x.', vol: 0.3 } };
const rockLoud = { ...rock, hat: { p: 'x.x.x.x.x.x.x.x.', voice: 'openhat', vol: 0.3 } };
const loop = (chords, tracks) => ({ bpm: 80, key: 10, mode: 'major', bars: chords.length, spb: 16, swing: 0, chords, tracks });

const RIFF = ['I5', 'bVI5', 'IV5', 'bII5', 'VII5']; // Bb  F#(Gb)  Eb  B  A
const RIFF_E = ['I5', 'bVI5', '#IV5', 'bII5', 'VII5']; // Bb  F#  E  B  A
const CHORUS_A = ['I5', 'VI5', 'V5', 'bVII5']; // Bb G F Ab
const CHORUS_B = ['I5', 'VI5', 'II5', 'IV5']; // Bb G C Eb

export const BAND_SONGS = [
  {
    id: 'inbloom',
    title: 'In Bloom',
    artist: 'Nirvana',
    summary: 'Loud-quiet-loud. The verses drop the guitar and leave the bass carrying the song with the drums, so the verse line is yours. Everything is built from power chords (root + 5th, no 3rd), which means your root is what decides the chord.',
    status: 'Draft from published chord sheets, which disagree in places. The riff order (Bb, F#, Eb, B, A) shows up in two independent transcriptions. One sheet has E instead of Eb, and the chorus appears two ways. Flip the variants while the record plays and keep whichever matches.',
    sources: [
      ['Songsterr bass tab', 'https://www.songsterr.com/a/wsa/nirvana-in-bloom-bass-tab-s295'],
      ['Isolated bass & drums (No Treble)', 'https://www.notreble.com/buzz/2015/02/09/nirvana-in-bloom-isolated-bass-and-drums/'],
      ['Isolated bass (Far Out)', 'https://faroutmagazine.co.uk/nirvana-krist-novoselic-in-bloom-isolated-bass/'],
    ],
    parts: [
      {
        id: 'inbloom-riff',
        title: 'In Bloom: the riff & verse',
        idea: 'Five roots that barely belong to one key: Bb, F#, Eb, B, A. That is the Cobain trick. A power chord is just root + 5th with no 3rd, so it isn\'t major or minor and can move anywhere. The labels read I, bVI, IV, bII, VII: most of these roots are borrowed or chromatic. In the verse the guitar drops out, so your root alone tells the room which chord it is.',
        band: 'Learn the five roots one per bar first (variant C), slowly, until you can play them without looking. Then put the record on, play along with the verse, and listen for what Krist adds between the roots. That melodic part is what you\'re missing. Add it in the Studio one note at a time.',
        loop: loop(RIFF, rock),
        variants: [
          { label: 'Riff (Eb)', what: 'Loud version with guitar: Bb – F# – Eb – B – A. Two transcriptions agree on this order.', tracks: { ...rockLoud, chords: guitar, bass: bass8(RIFF) } },
          { label: 'Riff (E)', what: 'Same, but the third root is E instead of Eb (one transcription). Play the record and check which one you hear.', chords: RIFF_E, tracks: { ...rockLoud, chords: guitar, bass: bass8(RIFF_E) } },
          { label: 'Verse map', what: 'Guitar out: just you and the drums. Roots only, one chord per bar, a map to learn the shape on the neck. The real verse has more movement; add it by ear.', tracks: { ...rock, chords: silent, bass: bassMap(RIFF) } },
        ],
      },
      {
        id: 'inbloom-chorus',
        title: 'In Bloom: the chorus',
        idea: 'The loud part. In grunge choruses the bass usually plays straight 8th-note roots locked with the guitar, so the low end becomes one wall. Two chord orders show up in published sheets: Bb–G–F–Ab and Bb–G–C–Eb. They start the same, so the question is only where it goes after G.',
        band: 'At practice, ask the guitarist which shapes they play after G and match the roots. Playing 8ths at this tempo for a whole chorus takes stamina: keep your picking hand loose and let the kick drum set your accents.',
        loop: loop(CHORUS_A, rockLoud),
        variants: [
          { label: 'Bb–G–F–Ab', what: 'I – VI – V – bVII. Ab is borrowed from the minor side, which is part of what gives it the sour-sweet sound.', tracks: { ...rockLoud, chords: guitar, bass: bass8(CHORUS_A) } },
          { label: 'Bb–G–C–Eb', what: 'I – VI – II – IV. Brighter: C and Eb pull back up toward home.', chords: CHORUS_B, tracks: { ...rockLoud, chords: guitar, bass: bass8(CHORUS_B) } },
          { label: 'Roots only', what: 'Candidate A as long notes, so you can hear the movement clearly and find it on the neck.', tracks: { ...rockLoud, chords: guitar, bass: bassMap(CHORUS_A) } },
        ],
      },
    ],
  },
];

export const BAND_PARTS = BAND_SONGS.flatMap((s) => s.parts.map((p) => ({ ...p, song: s.id })));
