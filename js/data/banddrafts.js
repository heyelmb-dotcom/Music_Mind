// Starting points for the band's covers. Tuning and home key come from published tabs and
// interviews (linked); where sources disagree, the notes say so. Bass lines are NOT included:
// each part starts as a basic beat with the bass on the home note, in the right tuning,
// for you to replace with the real part by ear.

const parts = (...names) => names.map((name, i) => ({ id: 'p' + (i + 1), name, note: '' }));
const FORM = () => parts('Intro / main riff', 'Verse', 'Chorus', 'Bridge / breakdown');

export const BAND_DRAFTS = [
  {
    id: 'walk', title: 'Walk', artist: 'Pantera', tuning: 'dropD', key: 2, mode: 'minor', bpm: null, swing: 0.3,
    notes: 'The most-viewed bass tab is in drop D with a swung, triplet feel, and the riff sits on the open low D with a 0-2-1-0 figure. Other transcribers say the record is D standard tuned a little flat (around A=434), so tune to the record, not to a tuner.',
    sources: [['Ultimate Guitar bass tab', 'https://tabs.ultimate-guitar.com/tab/pantera/walk-bass-5267'], ['Guitar Tabs Explorer bass tab', 'https://www.guitartabsexplorer.com/pantera/walk-btab']],
  },
  {
    id: 'dragula', title: 'Dragula', artist: 'Rob Zombie', tuning: 'dropC', key: 0, mode: 'minor', bpm: null,
    notes: 'Drop C, according to a tab based on the studio recording and Blasko\'s own "Behind the Player" lesson. The riff is simple and best played with a pick. Other tabs claim C standard or a 5-string; the DVD is the best reference.',
    sources: [['Ultimate Guitar bass tab (drop C)', 'https://tabs.ultimate-guitar.com/tab/rob-zombie/dragula-bass-3'], ['Ultimate Guitar bass tab (alt)', 'https://tabs.ultimate-guitar.com/tab/rob-zombie/dragula-bass-2762089']],
  },
  {
    id: 'sugar-soad', title: 'Sugar', artist: 'System of a Down', tuning: 'dropC', key: 0, mode: 'minor', bpm: null,
    notes: 'Shavo tunes to drop C (C G C F), using a heavy 130-gauge low string so it stays tight. The home note is likely the low open C; verify by ear. Expect sudden stops and switches between sections.',
    sources: [['Ernie Ball: Shavo on his rig', 'https://blog.ernieball.com/interesting/the-top-six-things-we-learned-from-watching-ernie-ball-string-theory-featuring-shavo-odadjian-of-system-of-a-down/'], ['Ultimate Guitar tab', 'https://pt.ultimate-guitar.com/tab/system-of-a-down/sugar-tabs-116039']],
  },
  {
    id: 'blind', title: 'Blind', artist: 'Korn', tuning: 'fiveDown', key: 9, mode: 'minor', bpm: null,
    notes: 'Fieldy plays a 5-string tuned down a whole step (A D G C F). On a 4-string, tune A D G C to reach the same notes. Community tabs disagree on which strings the verse sits on, so trust your ear. The home note here (A) is a guess.',
    sources: [['Ultimate Guitar bass tab (A D G C F)', 'https://tabs.ultimate-guitar.com/tab/korn/blind-bass-170383'], ['Ultimate Guitar bass tab (alt)', 'https://tabs.ultimate-guitar.com/tab/korn/blind-bass-10456']],
  },
  {
    id: 'luxaeterna', title: 'Lux Æterna', artist: 'Metallica', tuning: 'std', key: 9, mode: 'minor', bpm: null,
    notes: 'Standard tuning. Tabs disagree on the key (A, Am or Em); the bass tab\'s intro is a repeated pattern on the A and E strings. It\'s fast, so tap the tempo against the record.',
    sources: [['Guitar Tabs Explorer bass tab', 'https://www.guitartabsexplorer.com/metallica/lux-aeterna-btab'], ['Ultimate Guitar tab', 'https://tabs.ultimate-guitar.com/tab/4441595']],
  },
  {
    id: 'animal', title: 'Animal I Have Become', artist: 'Three Days Grace', tuning: 'dropD', key: 2, mode: 'minor', bpm: null,
    notes: 'Songsterr has the bass in drop D (with standard and 5-string versions too). Musicnotes lists the bass part in F major with a range of D2–E3, which points to D minor with the low open D as home.',
    sources: [['Songsterr bass', 'https://www.songsterr.com/a/wsa/three-days-grace-tabs-a198?inst=bass'], ['Guitar Tabs Explorer bass tab', 'https://www.guitartabsexplorer.com/three-days-grace/animal-i-have-become-btab']],
  },
  {
    id: 'thunderkiss', title: "Thunder Kiss '65", artist: 'White Zombie', tuning: 'std', key: 4, mode: 'minor', bpm: null,
    notes: 'Transcriptions are in standard tuning with a palm-muted intro riff built on the open low E. The tabs found were guitar tabs, so the bass line is yours to work out by ear.',
    sources: [['Ultimate Guitar tab', 'https://pt.ultimate-guitar.com/tab/white-zombie/thunder-kiss-65-tabs-262917'], ['Wikipedia', 'https://en.wikipedia.org/wiki/Thunder_Kiss_%2765']],
  },
  {
    id: 'sickness', title: 'Down with the Sickness', artist: 'Disturbed', tuning: 'dropCs', key: 1, mode: 'minor', bpm: null,
    notes: 'Tabs point to drop C# (one bass tab calls it "half step down C"); its string labels look off, so check against the record. Bonedo has a bass workshop on this riff.',
    sources: [['Guitar Tabs Explorer bass tab', 'https://www.guitartabsexplorer.com/disturbed/down-with-the-sickness-(Ver2)-btab'], ['Bonedo bass riff workshop (German)', 'https://www.bonedo.de/?p=1072176']],
  },
  {
    id: 'cayaa', title: 'Come As You Are', artist: 'Nirvana', tuning: 'dStd', key: 2, mode: 'minor', bpm: null,
    notes: 'The record is tuned down a whole step. Transcriptions write the riff in E minor; it sounds in D. In D standard (D G C F) you play the same shapes as the E-minor tab and the app shows them at the pitch you hear. Krist doubles the guitar riff.',
    sources: [['Musicnotes bass transcription', 'https://apps.musicnotes.com/marketplace/sheetmusic/MK0078413']],
  },
].map((s) => ({ ...s, draft: true, parts: FORM() }));

// A starter project for one part: a basic heavy beat, the home chord, and the bass on the
// lowest home note in this tuning. Meant to be replaced, not learned from.
export function starterSketch(song, part) {
  return {
    name: `${song.title} – ${part.name}`,
    bpm: song.bpm || 100,
    key: song.key ?? 0,
    mode: song.mode || 'minor',
    tuning: song.tuning || 'std',
    bars: 2,
    spb: 16,
    swing: song.swing || 0,
    chords: ['I5'],
    tracks: {
      kick: { p: 'x.......x.x.....' },
      snare: { p: '....x.......x...' },
      hat: { p: 'x.x.x.x.x.x.x.x.', vol: 0.3 },
      chords: { p: 'x.x.x.x.x.x.x.x.', voice: 'grit', gate: 'normal', vol: 0.4 },
    },
  };
}
