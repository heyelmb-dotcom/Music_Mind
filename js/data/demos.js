// Starter patterns that demonstrate a concept. Loaded into the Studio from the Path.
export const DEMOS = {
  backbeat: {
    name: 'Backbeat vs half-time', bpm: 92, key: 0, mode: 'major', bars: 2, spb: 16, chords: ['I', 'I'],
    tracks: {
      kick: { p: 'x.......x.x..... x.........x.....' },
      snare: { p: '....x.......x... ........x.......' },
      hat: { p: 'x.x.x.x.x.x.x.x.', vol: 0.4 },
    },
  },
  rootmotion: {
    name: 'Bass on the roots', bpm: 96, key: 9, mode: 'minor', bars: 4, spb: 16, chords: ['i', 'bVI', 'bIII', 'bVII'],
    tracks: {
      kick: { p: 'x.....x...x.....' }, snare: { p: '....x.......x...' }, hat: { p: 'x.x.x.x.x.x.x.x.', vol: 0.4 },
      bass: { p: '0 . . . . . 0 . . . 12 . . . . . 8 . . . . . 8 . . . 15 . . . . . 3 . . . . . 3 . . . 15 . . . . . 10 . . . . . 10 . . . 17 . . . . .', voice: 'sawbass' },
      chords: { p: 'x.......x.......', voice: 'epiano' },
    },
  },
  sidechain: {
    name: 'Sidechain pump', bpm: 122, key: 5, mode: 'minor', bars: 2, spb: 16, chords: ['i', 'bVI'],
    tracks: {
      kick: { p: 'x...x...x...x...' }, snare: { p: '....x.......x...', voice: 'clap' }, hat: { p: '..x...x...x...x.', voice: 'openhat', vol: 0.35 },
      bass: { p: '. . 0 . . . 0 . . . 0 . . . 0 . . . 8 . . . 8 . . . 8 . . . 8 .', voice: 'sawbass', gate: 'normal', duck: true },
      pad: { p: 'x...............', voice: 'pad', duck: true, vol: 0.7 },
    },
  },
  triplets: {
    name: '12/8 sway', bpm: 70, key: 2, mode: 'major', bars: 2, spb: 12, chords: ['I', 'vi'],
    tracks: {
      kick: { p: 'x.....x.....' }, snare: { p: '......x.....' }, hat: { p: 'x.xx.xx.xx.x', vol: 0.4 },
      bass: { p: '0 . . . . . 0 . . 7 . . 9 . . . . . 9 . . 4 . .', voice: 'sub' },
      chords: { p: 'x..x..x..x..', voice: 'epiano' },
    },
  },
};
