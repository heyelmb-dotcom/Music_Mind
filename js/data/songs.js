// Song maps. These are DRAFTS: the structure is a starting scaffold and the
// "missions" are what you confirm by ear. Mapping a song yourself (in the editor)
// is the actual learning. Sketches are style studies in the song's world —
// not transcriptions — so you can rebuild the vibe in the Studio.
import { parseRoman } from '../theory.js';

// Build a bassline from a chord list and a one-bar template.
// R = root, F = fifth, O = octave, . = rest. Template tokens per step.
function bassLine(chords, tmpl) {
  const toks = tmpl.trim().split(/\s+/);
  return chords.map((r) => {
    const root = parseRoman(r).semi;
    return toks.map((t) => {
      if (t === '.') return '.';
      let n = root + (t === 'F' ? 7 : t === 'O' ? 12 : 0);
      if (n > 19) n -= 12;
      return String(n);
    }).join(' ');
  }).join(' ');
}

const L = { rhythm: true, bass: true, harmony: true, melody: true, texture: false, vocal: true };
const sec = (name, bars, energy, layers, chords = '', notes = '') => ({ name, bars, energy, layers: { ...L, ...layers }, chords, notes });

export const LAYERS = [
  { id: 'rhythm', label: 'Drums' },
  { id: 'bass', label: 'Bass' },
  { id: 'harmony', label: 'Chords' },
  { id: 'melody', label: 'Hook/lead' },
  { id: 'vocal', label: 'Vocal' },
  { id: 'texture', label: 'Texture/FX' },
];

const popPunk = ['I', 'V', 'vi', 'IV'];
const jazz = ['Imaj7', 'vi7', 'ii7', 'V7'];
const gospel = ['I', 'IV', 'I', 'V'];
const bedroom = ['I', 'iii', 'IV', 'iv'];
const folk = ['Imaj7', 'IVmaj7', 'iii7', 'vi7'];
const ballad = ['i', 'bVI', 'bIII', 'bVII'];
const altpop = ['vi', 'IV', 'I', 'V'];
const emo = ['i', 'bVI', 'bIII', 'bVII'];

export const SONGS = [
  {
    id: 'sugar',
    title: "Sugar, We're Goin Down",
    artist: 'Fall Out Boy',
    lens: 'Pop-punk / emo: speed, compression and a chorus built to be screamed back.',
    requires: [],
    key: null, bpm: null, draft: true,
    why: 'Pop-punk is a game of contrast at high speed. Tight, palm-muted verses hold energy back so open, crashing choruses can explode. The drums barely let up; the dynamics come from the guitars opening up and the vocal jumping register.',
    missions: [
      'Tap the tempo. Is it closer to 120, 140 or 160+ BPM?',
      'In the verse, are the guitars muted and chuggy, or ringing open? What about the chorus?',
      'Find the home note (the one the chorus resolves to). Play it on the Studio lead track to name the key.',
      'How many different chords does the chorus cycle through? Try the four-chord family first.',
      'In the bridge, what drops out, and what comes back for the final chorus?',
    ],
    sections: [
      sec('Intro', 8, 3, { vocal: false }),
      sec('Verse 1', 16, 2, {}),
      sec('Pre-chorus', 8, 3, {}),
      sec('Chorus', 16, 5, { texture: true }),
      sec('Verse 2', 16, 2, {}),
      sec('Pre-chorus', 8, 3, {}),
      sec('Chorus', 16, 5, { texture: true }),
      sec('Bridge', 8, 2, { bass: false }),
      sec('Final chorus', 16, 5, { texture: true }),
    ],
    sketch: {
      name: 'Pop-punk drive', bpm: 160, key: 4, mode: 'major', bars: 4, spb: 16, swing: 0, chords: popPunk,
      tracks: {
        kick: { p: 'x.....x.x.......' }, snare: { p: '....x.......x...' }, hat: { p: 'x.x.x.x.x.x.x.x.', voice: 'openhat', vol: 0.4 },
        bass: { p: bassLine(popPunk, 'R . R . R . R . R . R . R . R .'), voice: 'pluckbass', gate: 'normal' },
        chords: { p: 'x.x.x.x.x.x.x.x.', voice: 'grit', gate: 'normal', vol: 0.55 },
        lead: { p: '16 . . . 14 . 12 . . . 11 . 12 . . . 16 . . . 14 . 12 . . . 14 . 12 . . . 12 . . . 11 . 9 . . . 7 . 9 . . . 9 . . . 11 . 12 . . . 14 . 16 . . .', voice: 'saw' },
      },
    },
  },
  {
    id: 'weed',
    title: 'How Much Is Weed?',
    artist: 'Dominic Fike',
    lens: 'Bedroom guitar-pop: a demo that kept its rough edges on purpose.',
    requires: [],
    key: null, bpm: null, draft: true,
    why: 'Demo-style records win on immediacy. A loose, real-sounding performance, few layers and a melody that does all the work. Leaving it unpolished is a production decision: the intimacy is the hook.',
    missions: [
      'Count the layers. How many distinct parts can you name at the busiest moment?',
      'Is the guitar strummed, picked or chopped? Does it play the same pattern all the way through?',
      'Do the drums sound programmed or live? What gives it away (timing, room sound, repetition)?',
      'Is the vocal doubled, dry, or drenched in reverb?',
      'Map the form: how short is it, and where does the energy peak?',
    ],
    sections: [
      sec('Intro', 4, 2, { vocal: false, rhythm: false }),
      sec('Verse', 16, 3, {}),
      sec('Hook', 8, 4, {}),
      sec('Verse', 16, 3, {}),
      sec('Hook', 8, 4, {}),
      sec('Outro', 4, 2, { rhythm: false }),
    ],
    sketch: {
      name: 'Bedroom guitar-pop', bpm: 100, key: 7, mode: 'major', bars: 4, spb: 16, swing: 0.12, chords: bedroom,
      tracks: {
        kick: { p: 'x.......x.x.....' }, snare: { p: '....x.......x...', voice: 'rim', vol: 0.6 }, hat: { p: 'x.xxx.x.x.xxx.x.', vol: 0.35 },
        bass: { p: bassLine(bedroom, 'R . . . . . . R . . R . . . . .'), voice: 'sub' },
        chords: { p: 'x..x..x...x..x..', voice: 'guitar', gate: 'normal', vol: 0.6 },
        lead: { p: '. . . . 7 . 9 . 11 . . . 9 . 7 . . . . . 4 . 7 . 9 . . . 7 . 4 . . . . . 9 . 7 . 5 . . . 4 . 2 . . . . . 0 . 2 . 4 . . . . . . .', voice: 'flute' },
      },
    },
  },
  {
    id: 'lovelost',
    title: 'Love Lost',
    artist: 'Mac Miller',
    lens: 'Jazz-rap / boom-bap: dusty drums, sample-style 7th chords, laid-back swing.',
    requires: ['majmin', 'sevenths'],
    key: null, bpm: null, draft: true,
    why: 'This world runs on contrast between hard-ish drums and soft, jazzy harmony. Seventh chords keep the harmony floating and never fully resolved, and swung drums sit behind the beat. The rapper rides the pocket instead of pushing it.',
    missions: [
      'Does the beat swing? Are the hats straight or lagging slightly?',
      'Are the chords triads or 7ths? (Floating and jazzy usually means 7ths.)',
      'Does the main loop sound sampled (vinyl texture, a different room) or played fresh?',
      'Where are the kick hits? Write the kick pattern on the 16-step grid.',
      'What changes between verse and hook: drums, chords, or just the vocal?',
    ],
    sections: [
      sec('Intro', 4, 2, { rhythm: false, vocal: false }),
      sec('Verse 1', 16, 3, {}),
      sec('Hook', 8, 4, {}),
      sec('Verse 2', 16, 3, {}),
      sec('Hook', 8, 4, {}),
      sec('Outro', 4, 2, { vocal: false }),
    ],
    sketch: {
      name: 'Dusty jazz boom-bap', bpm: 88, key: 2, mode: 'major', bars: 4, spb: 16, swing: 0.3, chords: jazz,
      tracks: {
        kick: { p: 'x.........x..x..' }, snare: { p: '....x.......x...' }, hat: { p: 'x.x.x.x.x.x.x.x.', vol: 0.4 },
        perc: { p: '.......o.......o', voice: 'rim', vol: 0.5 },
        bass: { p: bassLine(jazz, 'R . . . . . . . . . F . R . . .'), voice: 'sub' },
        chords: { p: 'x.......x.......', voice: 'epiano', cutoff: 0.75, reverb: 0.3 },
      },
    },
  },
  {
    id: 'cannock',
    title: 'Cannock Chase',
    artist: 'Labi Siffre',
    lens: 'Early-70s acoustic soul-folk: warm, voice-led and every instrument breathing.',
    requires: ['intervals', 'sevenths'],
    key: null, bpm: null, draft: true,
    why: 'Records like this are arranged around the voice. Parts enter and leave to support the story rather than to build a drop. The harmony is often richer than it first sounds: listen for 7ths, suspended chords and bass notes that walk between chords.',
    missions: [
      'Name every instrument you hear. Which ones enter later, and when?',
      'Does the bass walk between chords or sit on roots?',
      'Find a moment where the chord feels "suspended" or unresolved. What happens next?',
      'Is the vocal mostly stepwise (small intervals) or leaping? Name one leap.',
      'How does the arrangement change for the last section?',
    ],
    sections: [
      sec('Intro', 4, 1, { rhythm: false, vocal: false }),
      sec('Verse 1', 16, 2, { rhythm: false }),
      sec('Chorus', 8, 3, {}),
      sec('Verse 2', 16, 2, {}),
      sec('Chorus', 8, 3, { texture: true }),
      sec('Outro', 8, 2, {}),
    ],
    sketch: {
      name: 'Soul-folk warmth', bpm: 92, key: 9, mode: 'major', bars: 4, spb: 16, swing: 0.15, chords: folk,
      tracks: {
        kick: { p: 'x.......x.......', vol: 0.5 }, perc: { p: 'x.x.x.x.x.x.x.x.', voice: 'shaker', vol: 0.5 },
        snare: { p: '....x.......x...', voice: 'rim', vol: 0.4 },
        bass: { p: bassLine(folk, 'R . . . . . . . F . . . . . . .'), voice: 'sub' },
        chords: { p: 'x..x..x.x..x..x.', voice: 'guitar', gate: 'normal', vol: 0.55 },
        pad: { p: 'x...............', voice: 'strings', vol: 0.35 },
      },
    },
  },
  {
    id: 'rockroll',
    title: 'rock + roll',
    artist: 'EDEN',
    lens: 'Electronic alt-pop: guitars and synths, heavy processing and huge dynamic swings.',
    requires: ['sidechain', 'freq1'],
    key: null, bpm: null, draft: true,
    why: 'This lane blends band instruments with electronic production: sidechained pads, processed vocals and long builds into big releases. The emotional jolts come from sharp contrasts, near-silence against full-spectrum walls of sound.',
    missions: [
      'Find a moment of near-silence. What is the only thing left playing?',
      'Can you hear anything "pumping" (sidechained) against the kick?',
      'Is the vocal processed: doubled, pitched, filtered, distorted? Where does it change?',
      'Which frequency zone dominates the loudest section: lows, mids or highs?',
      'Map the energy curve. Where is the single biggest jump?',
    ],
    sections: [
      sec('Intro', 8, 1, { rhythm: false, bass: false }),
      sec('Verse', 16, 2, { bass: false }),
      sec('Build', 8, 3, { texture: true }),
      sec('Chorus', 16, 5, { texture: true }),
      sec('Breakdown', 8, 1, { rhythm: false }),
      sec('Final chorus', 16, 5, { texture: true }),
    ],
    sketch: {
      name: 'Sidechained alt-pop', bpm: 120, key: 1, mode: 'major', bars: 4, spb: 16, swing: 0, chords: altpop,
      tracks: {
        kick: { p: 'x...x...x...x...' }, snare: { p: '....x.......x...', voice: 'clap' }, hat: { p: '..x...x...x...x.', voice: 'openhat', vol: 0.35 },
        bass: { p: bassLine(altpop, 'R . R . . . R . R . . . R . R .'), voice: 'sawbass', duck: true, gate: 'normal' },
        chords: { p: 'x.x...x.x.x...x.', voice: 'pluck', duck: true, gate: 'normal', vol: 0.5 },
        pad: { p: 'x...............', voice: 'pad', duck: true, vol: 0.6 },
      },
    },
  },
  {
    id: 'ghosttown',
    title: 'Ghost Town',
    artist: 'Kanye West',
    lens: 'Gospel-rock soul sampling: raw, distorted, and the catharsis is in the outro.',
    requires: ['subtraction', 'borrowed'],
    key: null, bpm: null, draft: true,
    why: 'A song that hands off between voices instead of repeating a verse/chorus loop, and that puts its emotional climax at the end. The production embraces distortion and rawness. Rough edges read as honesty, and the final section opens up into release.',
    missions: [
      'List every distinct voice and the order they appear in. How does each one change the energy?',
      'Does the opening hook sound like a sample? What clues tell you (texture, pitch, room)?',
      'Where does distortion show up: the drums, the guitar, the vocals, the whole mix?',
      'What drops out right before the final section, and what floods in?',
      'Map the chords of the final section. Are any of them borrowed (bVII, iv, bVI)?',
    ],
    sections: [
      sec('Hook (intro voice)', 8, 2, { rhythm: false }),
      sec('Verse', 16, 3, {}),
      sec('Hook', 8, 3, {}),
      sec('Bridge voice', 8, 3, {}),
      sec('Outro / release', 16, 5, { texture: true }),
    ],
    sketch: {
      name: 'Gospel-rock flip', bpm: 72, key: 5, mode: 'major', bars: 4, spb: 16, swing: 0.18, chords: gospel,
      tracks: {
        kick: { p: 'x......x..x.....' }, snare: { p: '........x.......', vol: 0.9 }, hat: { p: 'x.x.x.x.x.x.x.x.', vol: 0.3 },
        bass: { p: bassLine(gospel, 'R . . . . . . R . . R . . . . .'), voice: 'sub' },
        chords: { p: 'x.......x.......', voice: 'organ', vol: 0.45, reverb: 0.3 },
        pad: { p: 'x...............', voice: 'choir', vol: 0.4 },
        lead: { p: '. . . . . . . . 12 . . . 14 . 12 . 9 . . . . . . . 7 . . . 9 . . . 12 . . . . . . . 9 . 7 . 5 . . . 7 . . . . . . . . . . . . . . .', voice: 'guitar', vol: 0.5 },
      },
    },
  },
  {
    id: 'grace',
    title: 'Grace',
    artist: 'Jeff Buckley',
    lens: 'Dramatic rock ballad: odd tunings, swaying meter, strings and a voice that goes everywhere.',
    requires: ['intervals', 'borrowed', 'triplets'],
    key: null, bpm: null, draft: true,
    why: 'Built like a slow-burning storm. The guitar part is harmonically ambiguous and drone-heavy, the meter sways instead of marches, and the arrangement keeps adding pressure (strings, drums opening up, the vocal climbing) until the climax. A masterclass in long-form dynamics.',
    missions: [
      'Count the pulse. Does it divide into 2s (straight) or 3s (6/8, 12/8 sway)?',
      'Does the guitar ring open strings under the chord changes (a drone)? Which note stays constant?',
      'When do the strings enter, and what are they doing: pads, lines or stabs?',
      'Find the biggest vocal leap you can. Name the interval.',
      'Map the energy curve from start to the climax. How many "steps up" are there?',
    ],
    sections: [
      sec('Intro', 4, 2, { vocal: false, bass: false }),
      sec('Verse 1', 16, 2, {}),
      sec('Chorus', 8, 3, {}),
      sec('Verse 2', 16, 3, { texture: true }),
      sec('Chorus', 8, 4, { texture: true }),
      sec('Bridge / build', 8, 4, { texture: true }),
      sec('Climax', 8, 5, { texture: true }),
      sec('Outro', 4, 2, {}),
    ],
    sketch: {
      name: '12/8 slow burn', bpm: 66, key: 4, mode: 'minor', bars: 4, spb: 12, swing: 0, chords: ballad,
      tracks: {
        kick: { p: 'x.....x.....' }, snare: { p: '......x.....', vol: 0.8 }, hat: { p: 'xxxxxxxxxxxx', voice: 'shaker', vol: 0.35 },
        bass: { p: bassLine(ballad, 'R . . . . . R . . . . .'), voice: 'sub' },
        pad: { p: 'x...........', voice: 'strings', vol: 0.45 },
        lead: { p: '12 7 3 12 7 3 12 7 3 15 12 7 8 3 0 8 3 0 8 3 0 12 8 3 15 10 7 15 10 7 15 10 7 19 15 10 14 10 5 14 10 5 14 10 5 17 14 10', voice: 'guitar', vol: 0.45, gate: 'legato' },
      },
    },
  },
  {
    id: 'rosier',
    title: 'rosier',
    artist: 'brakence',
    lens: 'Hyperpop / emo-rap fusion: glitch edits, pitched vocals, 808s under guitar.',
    requires: ['freq2', 'subtraction', 'sidechain'],
    key: null, bpm: null, draft: true,
    why: 'This lane collides emo guitar and songwriting with internet-era production: chopped and pitched vocals, abrupt edits, saturated 808s and sudden switches in texture. The skill is in the edits, deciding exactly when to cut, stutter or flip the beat.',
    missions: [
      'Mark every abrupt edit or beat switch you hear. How many are there?',
      'Is the low end an 808 (pitched, long sub), a bass guitar, or both?',
      'Find a vocal that has been pitched up or down. What does it add emotionally?',
      'Hats: straight 16ths, triplet rolls, or both? Where do the rolls happen?',
      'Which frequency zone carries the guitar vs. the 808? Do they fight?',
    ],
    sections: [
      sec('Intro', 4, 2, { rhythm: false }),
      sec('Verse', 16, 3, {}),
      sec('Hook', 8, 5, { texture: true }),
      sec('Switch-up', 8, 4, { texture: true }),
      sec('Hook', 8, 5, { texture: true }),
      sec('Outro', 4, 1, { rhythm: false, bass: false }),
    ],
    sketch: {
      name: 'Glitch-emo 808', bpm: 150, key: 11, mode: 'minor', bars: 4, spb: 16, swing: 0, chords: emo,
      tracks: {
        kick: { p: 'x.....x...x.....', voice: '808', vol: 0.9 }, snare: { p: '........x.......', voice: 'clap' },
        hat: { p: 'xoxoxoxoxxxxxoxo', vol: 0.35 }, perc: { p: '..............x.', voice: 'openhat', vol: 0.3 },
        chords: { p: 'x.......x.......', voice: 'guitar', vol: 0.5, reverb: 0.35 },
        lead: { p: '15 . 14 . 10 . . . 7 . . . 10 . . . 12 . 10 . 8 . . . 7 . . . 3 . . . 10 . 12 . 15 . . . 14 . . . 10 . . . 15 . 17 . 19 . . . 17 . 15 . 14 . . .', voice: 'bell', vol: 0.5 },
      },
    },
  },
];

export const blankSong = () => ({
  id: 'custom-' + Date.now().toString(36),
  title: 'New song',
  artist: '',
  lens: '',
  requires: [],
  key: null,
  bpm: null,
  draft: false,
  custom: true,
  why: '',
  missions: [],
  sections: [sec('Intro', 4, 2, {}), sec('Verse', 16, 3, {}), sec('Chorus', 8, 4, {})],
  sketch: null,
});
