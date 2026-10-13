// The concept path. Concepts are always open to study; their trials are what unlock songs.
import { chordRootPc, mod12 } from '../theory.js';

const SNAREISH = ['snare', 'clap', 'rim'];
const HATISH = ['hat', 'openhat', 'shaker', 'rim'];
const KICKISH = ['kick', '808'];

const drumsOf = (p, voices) => p.tracks.filter((t) => t.kind === 'drum' && voices.includes(t.voice));
const hitAt = (tracks, s) => tracks.some((t) => !!t.steps[s]);

export const CONCEPTS = [
  {
    id: 'backbeat',
    title: 'The backbeat',
    side: 'rhythm',
    idea: [
      'Almost every popular song since the 1950s is built on the same skeleton: the kick anchors beat 1, and the snare (or clap) cracks on beats 2 and 4. That crack on 2 and 4 is the backbeat. It is why your head nods.',
      'On a 16-step grid, beats land on steps 1, 5, 9 and 13. The snare goes on 5 and 13. Move the snare to only step 9 and you get half-time: the same tempo feels twice as slow and heavy. That is a huge trick in hip-hop, trap and breakdowns.',
    ],
    listen: 'Put on any of your songs and tap your foot. Find the crack on 2 and 4. Then notice which songs move it, drop it or halve it.',
    demo: 'backbeat',
    trial: {
      type: 'build',
      task: 'In the Studio, build a beat with the kick on beat 1 and a snare or clap on beats 2 and 4 of every bar. Then check it here.',
      check(p) {
        const q = p.spb / 4;
        const kicks = drumsOf(p, KICKISH), snares = drumsOf(p, SNAREISH);
        for (let b = 0; b < p.bars; b++) {
          const o = b * p.spb;
          if (!hitAt(kicks, o)) return { ok: false, msg: `Bar ${b + 1}: no kick on beat 1.` };
          if (!hitAt(snares, o + q) || !hitAt(snares, o + 3 * q)) return { ok: false, msg: `Bar ${b + 1}: snare/clap needs to hit beats 2 and 4 (steps ${q + 1} and ${3 * q + 1}).` };
        }
        return { ok: true };
      },
    },
  },
  {
    id: 'intervals',
    title: 'Intervals',
    side: 'musical',
    idea: [
      'An interval is the distance between two notes, and every melody and every chord is made of them. Learn five and you can already hear the shape of most hooks: minor 3rd (sad, bluesy), major 3rd (bright), perfect 4th ("Here Comes the Bride"), perfect 5th (power chords, the Star Wars theme) and octave ("Somewhere Over the Rainbow").',
      'Tip: tie each interval to a song you already know by heart. Your memory does the rest.',
    ],
    listen: 'Sing the first two notes of a vocal hook you love. How far apart are they?',
    trial: { type: 'ear', drill: 'intervals', opts: { set: ['m3', 'M3', 'P4', 'P5', 'P8'] }, need: 8, of: 10 },
  },
  {
    id: 'majmin',
    title: 'Major vs minor',
    side: 'musical',
    idea: [
      'A triad is three notes stacked in thirds. If the bottom third is major (4 semitones), the chord is major and sounds bright and settled. If it is minor (3 semitones), the chord is minor and sounds darker and more inward. One semitone flips the emotional colour.',
      'Producers lean on this all the time: a minor verse opening into a major chorus feels like the sun coming out.',
    ],
    listen: 'Watch for moments when a song suddenly "brightens" or "darkens". Usually a chord just changed quality.',
    trial: { type: 'ear', drill: 'quality', opts: { set: ['maj', 'min'] }, need: 8, of: 10 },
  },
  {
    id: 'fourchords',
    title: 'The four-chord family',
    side: 'musical',
    idea: [
      'Roman numerals name chords by their position in the key, so a progression is the same in every key. I is home. V pulls back toward home. vi is home\'s sad twin. IV is a lift away.',
      'Arrange those four and you get a huge share of pop: I–V–vi–IV (anthemic), vi–IV–I–V (the same chords started on the sad one, so it feels yearning), and I–vi–IV–V (doo-wop / 50s). Same ingredients, different starting point, different story.',
    ],
    listen: 'In a chorus, follow the bass note. Count how many different notes it lands on before the pattern repeats.',
    trial: { type: 'ear', drill: 'progression', opts: { set: ['pop', 'sad', 'doowop'] }, need: 6, of: 8 },
  },
  {
    id: 'rootmotion',
    title: 'Bass follows the root',
    side: 'musical',
    idea: [
      'The bass usually plays the root of each chord on the downbeat. It defines what the chord is: put a different note under the same chord and it changes meaning.',
      'Once the root is locked, bassists decorate the space between with octaves, 5ths and walk-ups into the next chord. The kick and the bass tend to hit together; that pairing is the floor of the track.',
    ],
    listen: 'Solo your attention onto the bass in a chorus. Does it sit on roots or wander?',
    demo: 'rootmotion',
    trial: {
      type: 'build',
      task: 'In the Studio, set a progression of at least 2 different chords, and write a bassline that plays each chord\'s root on beat 1 of its bar. (The "Roots" button is cheating, but cheating you can learn from.)',
      check(p) {
        if (new Set(p.chords).size < 2) return { ok: false, msg: 'Use at least two different chords in the chord lane.' };
        const bass = p.tracks.find((t) => t.id === 'bass');
        for (let b = 0; b < p.bars; b++) {
          const v = bass.steps[b * p.spb];
          if (v === null || v === undefined) return { ok: false, msg: `Bar ${b + 1}: no bass note on beat 1.` };
          if (mod12(p.key + v) !== chordRootPc(p.chords[b], p.key)) return { ok: false, msg: `Bar ${b + 1}: the bass on beat 1 isn't the root of ${p.chords[b]}.` };
        }
        return { ok: true };
      },
    },
  },
  {
    id: 'freq1',
    title: 'Frequency map I',
    side: 'production',
    idea: [
      'Every sound occupies a region of the frequency spectrum. Mixing is mostly about giving each part its own region. Start with three zones: the low end (~150 Hz: the thump of the kick and the body of the bass), the mids (~1 kHz: where voices and guitars live, and where things get nasal or honky) and the top (~8 kHz: air, cymbals, breath, sizzle).',
      'Logic\'s Channel EQ is this exact map. Learning to name a band by ear means you stop sweeping around and just reach for it.',
    ],
    listen: 'On laptop speakers vs. headphones, what disappears? (Usually everything below ~100 Hz.)',
    trial: { type: 'ear', drill: 'eq', opts: { set: ['150', '1k', '8k'] }, need: 8, of: 10 },
  },
  {
    id: 'subtraction',
    title: 'Arrangement is subtraction',
    side: 'production',
    idea: [
      'Big moments are made by what disappears right before them. Pull the kick for a bar before the drop. Strip the chorus to vocal and one instrument, then slam everything back. Mute the bass for the pre-chorus so the chorus feels like the floor came back.',
      'A song map is really a chart of which layers are on in each section. Learn to hear what dropped out and you can read any arrangement.',
    ],
    listen: 'Right before your favourite chorus hits, what goes quiet?',
    trial: { type: 'ear', drill: 'dropout', opts: { set: ['kick', 'snare', 'hat', 'bass', 'chords', 'lead'] }, need: 6, of: 8 },
  },
  {
    id: 'sidechain',
    title: 'Sidechain & pump',
    side: 'production',
    idea: [
      'Sidechain compression ducks one sound whenever another one hits. Classically, the pad and bass dip every time the kick lands. That clears room for the kick, and pushed hard it becomes the breathing, pumping groove at the heart of house, EDM and a lot of alt-pop.',
      'In Logic it\'s a compressor with the kick as its side-chain input. Here it\'s the DUCK switch on any track.',
    ],
    listen: 'On a sustained synth, listen for a swell that "breathes" in time with the kick.',
    demo: 'sidechain',
    trial: {
      type: 'build',
      task: 'In the Studio, put a four-on-the-floor kick (all 4 beats) in bar 1, then turn DUCK on for a pad, chord or bass track that is actually playing.',
      check(p) {
        const q = p.spb / 4;
        const kicks = drumsOf(p, KICKISH).filter((t) => !t.mute);
        for (let i = 0; i < 4; i++) if (!hitAt(kicks, i * q)) return { ok: false, msg: `Kick missing on beat ${i + 1} of bar 1.` };
        const ducked = p.tracks.filter((t) => t.duck && t.kind !== 'drum' && !t.mute && t.steps.some((v) => v !== null && v !== 0));
        if (!ducked.length) return { ok: false, msg: 'Turn DUCK on for a melodic track that has notes.' };
        return { ok: true };
      },
    },
  },
  {
    id: 'sevenths',
    title: 'Sevenths & colour',
    side: 'musical',
    idea: [
      'Add a fourth note on top of a triad and the chord gets colour. Major 7 sounds dreamy and wistful (neo-soul, bossa, bedroom pop). Minor 7 sounds smooth and melancholy (jazz-rap\'s home). Dominant 7 sounds bluesy and restless; it wants to resolve.',
      'Swap your triads for 7ths and pop instantly turns jazzy. A huge amount of sample-based hip-hop is minor-7 and major-7 chords looped over drums.',
    ],
    listen: 'In a jazzy loop, does the chord sound "finished" or "floating"? Floating usually means 7ths.',
    trial: { type: 'ear', drill: 'quality', opts: { set: ['maj7', 'min7', 'dom7'] }, need: 8, of: 10 },
  },
  {
    id: 'borrowed',
    title: 'Borrowed chords',
    side: 'musical',
    idea: [
      'Borrowed chords come from the parallel minor (or major) key. In a major key, bVII gives that rock / Beatles / gospel lift, iv (the minor four) is the heartbreak chord, and bVI is the cinematic, epic one.',
      'Minor keys have their own staples: i–bVI–bIII–bVII is one of the most-used progressions in modern emo, pop and film. The roman numerals here always measure against the major scale, so the flats tell you exactly what was borrowed.',
    ],
    listen: 'When a major-key song hits a chord that feels bittersweet, it\'s often iv or bVI.',
    trial: { type: 'ear', drill: 'progression', opts: { set: ['pop', 'mixo', 'minorIV', 'aeolian'] }, need: 6, of: 8 },
  },
  {
    id: 'triplets',
    title: 'Triplet feel (6/8, 12/8)',
    side: 'rhythm',
    idea: [
      'Split each beat into 3 instead of 4 and the music starts to roll and sway instead of march. That is 6/8 or 12/8: the feel of slow soul ballads, doo-wop, a lot of blues and a lot of dramatic rock ballads.',
      'Swing is the cousin of this: straight 16ths nudged toward the triplet grid. The Studio\'s 12-step grid is a full triplet grid.',
    ],
    listen: 'Count along. Do the beats divide into "1-and-2-and" or "1-trip-let-2-trip-let"?',
    demo: 'triplets',
    trial: {
      type: 'build',
      task: 'In the Studio, switch the grid to 12 (triplets). Put a kick on beat 1 and a hat/shaker playing at least 6 of the 12 steps in bar 1, including some off-beat triplets.',
      check(p) {
        if (p.spb !== 12) return { ok: false, msg: 'Switch the grid to 12 steps per bar.' };
        if (!hitAt(drumsOf(p, KICKISH), 0)) return { ok: false, msg: 'Kick needs to land on beat 1.' };
        const hats = drumsOf(p, HATISH);
        const hits = [...Array(12).keys()].filter((s) => hitAt(hats, s));
        if (hits.length < 6) return { ok: false, msg: 'The hats/shaker need at least 6 hits in bar 1.' };
        if (!hits.some((s) => s % 3 !== 0)) return { ok: false, msg: 'Put some hats between the beats (the "trip-let" positions).' };
        return { ok: true };
      },
    },
  },
  {
    id: 'freq2',
    title: 'Frequency map II',
    side: 'production',
    idea: [
      'Six bands now. 60 Hz is sub: you feel it more than hear it. 150 Hz is body and thump. 400 Hz is the "boxy/muddy" zone where most mixes get cluttered, and the classic cut. 1 kHz is nasal honk. 3 kHz is presence and bite: vocals cut through here, and too much is harsh. 8 kHz is air and sizzle.',
      'When something sounds wrong in a mix, it is almost always too much of one of these.',
    ],
    listen: 'Lo-fi records often roll off the extreme highs and lows. Hear the difference against a modern pop master.',
    trial: { type: 'ear', drill: 'eq', opts: { set: ['60', '150', '400', '1k', '3k', '8k'] }, need: 7, of: 10 },
  },
];

export const conceptById = (id) => CONCEPTS.find((c) => c.id === id);
