import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseRoman, chordSymbol, chordMidi, diatonicChords, chordRootPc, parseChordInput, chordTones, mod12 } from '../js/theory.js';
import { fromSketch, resize, newProject, gateSteps, isMelodic, chordAt, chordSegments, migrate, bassMidi, sortChords } from '../js/project.js';
import { projectToMidi } from '../js/midi.js';
import { CONCEPTS, conceptById } from '../js/data/concepts.js';
import { SONGS } from '../js/data/songs.js';
import { DEMOS } from '../js/data/demos.js';

test('roman numerals parse against the major scale', () => {
  const b7 = parseRoman('bVII');
  assert.equal(b7.semi, 10); assert.equal(b7.quality, 'maj'); assert.equal(b7.roman, 'bVII');
  assert.equal(parseRoman('vi').quality, 'min');
  assert.equal(parseRoman('ii7').quality, 'min7');
  assert.equal(parseRoman('V7').quality, 'dom7');
  assert.equal(parseRoman('vii°').quality, 'dim');
  assert.equal(parseRoman('nonsense'), null);
  assert.equal(chordSymbol('vi', 0), 'Am');
  assert.equal(chordSymbol('bVII', 9), 'G');
  assert.equal(chordSymbol('Imaj7', 2), 'Dmaj7');
  assert.equal(chordRootPc('IV', 7), 0);
});

test('diatonic chords come out right', () => {
  assert.deepEqual(diatonicChords('major'), ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°']);
  assert.deepEqual(diatonicChords('minor'), ['i', 'ii°', 'bIII', 'iv', 'v', 'bVI', 'bVII']);
  assert.deepEqual(diatonicChords('major', true), ['Imaj7', 'ii7', 'iii7', 'IVmaj7', 'V7', 'vi7', 'viiø7']);
});

test('chord voicing stays in a window and spells the chord', () => {
  const n = chordMidi('I', 0, 55);
  assert.deepEqual(n.map((x) => x % 12).sort(), [0, 4, 7]);
  assert.ok(n.every((x) => x >= 55 && x < 67));
});

test('sketch notation fills patterns and tonic notes count as hits', () => {
  const p = fromSketch({ bars: 2, spb: 16, chords: ['I', 'V'], tracks: { kick: { p: 'x...' }, bass: { p: '0 . . .' , gate: 'legato' } } });
  const kick = p.tracks.find((t) => t.id === 'kick');
  assert.equal(kick.steps.filter(Boolean).length, 8);
  const bass = p.tracks.find((t) => t.id === 'bass');
  assert.equal(bass.steps[0], 0);
  assert.equal(gateSteps(bass, 0, 32), 4 * 0.98);
});

test('resize keeps notes on shared positions', () => {
  const p = fromSketch({ bars: 1, spb: 16, tracks: { kick: { p: 'x...x...x...x...' } } });
  const r = resize(p, 2, 12);
  const kick = r.tracks.find((t) => t.id === 'kick');
  assert.equal(kick.steps.length, 24);
  assert.deepEqual(kick.steps.map((v, i) => (v ? i : -1)).filter((i) => i >= 0), [0, 3, 6, 9, 12, 15, 18, 21]);
});

test('MIDI export is a valid SMF', () => {
  for (const s of SONGS) {
    const bytes = projectToMidi(fromSketch(s.sketch), 2);
    assert.equal(String.fromCharCode(...bytes.slice(0, 4)), 'MThd');
    const ntracks = (bytes[10] << 8) | bytes[11];
    let off = 14, seen = 0;
    while (off < bytes.length) {
      assert.equal(String.fromCharCode(...bytes.slice(off, off + 4)), 'MTrk');
      const len = (bytes[off + 4] << 24) | (bytes[off + 5] << 16) | (bytes[off + 6] << 8) | bytes[off + 7];
      off += 8 + len;
      seen++;
    }
    assert.equal(off, bytes.length);
    assert.equal(seen, ntracks);
  }
});

test('every song is well-formed and its sketch patterns line up', () => {
  const ids = new Set(CONCEPTS.map((c) => c.id));
  for (const s of SONGS) {
    for (const r of s.requires) assert.ok(ids.has(r), `${s.id} requires unknown ${r}`);
    assert.ok(s.sections.length > 0);
    const sk = s.sketch;
    for (const c of sk.chords) assert.ok(parseRoman(c), `${s.id}: bad chord ${c}`);
    const p = fromSketch(sk);
    const total = sk.bars * sk.spb;
    for (const [tid, def] of Object.entries(sk.tracks)) {
      const tr = p.tracks.find((t) => t.id === tid);
      assert.ok(tr, `${s.id}: unknown track ${tid}`);
      const n = isMelodic(tr) ? def.p.trim().split(/\s+/).length : def.p.replace(/\s+/g, '').length;
      assert.equal(total % n, 0, `${s.id}/${tid}: pattern length ${n} doesn't divide ${total}`);
    }
  }
  const unlockedAtStart = SONGS.filter((s) => s.requires.length === 0);
  assert.ok(unlockedAtStart.length >= 1);
});

test('build trials pass on their demos and fail on an empty project', () => {
  const empty = newProject({ bars: 2, chords: ['I', 'V'] });
  for (const [cid, demo] of [['rootmotion', 'rootmotion'], ['sidechain', 'sidechain'], ['triplets', 'triplets']]) {
    const c = conceptById(cid);
    assert.equal(c.trial.check(fromSketch(DEMOS[demo])).ok, true, cid);
    assert.equal(c.trial.check(empty).ok, false, cid);
  }
  // The backbeat demo deliberately switches to half-time in bar 2, so it should fail.
  assert.equal(conceptById('backbeat').trial.check(fromSketch(DEMOS.backbeat)).ok, false);
  const good = fromSketch({ bars: 1, spb: 16, tracks: { kick: { p: 'x.......' }, snare: { p: '....x...' } } });
  assert.equal(conceptById('backbeat').trial.check(good).ok, true);
});

test('bass lab: every variant builds, lines up and labels its notes', async () => {
  const { BASS_LESSONS, lessonSketch, bassFrom } = await import('../js/data/bass.js');
  const { bassRole } = await import('../js/theory.js');
  assert.equal(bassFrom(['I', 'V'], 'R . 5 . 3 . A .'), '0 . 7 . 4 . 6 . 7 . 14 . 11 . 11 .');
  assert.equal(bassRole(11, 'V'), '3');
  assert.equal(bassRole(6, 'I', 'V'), '→');
  for (const l of BASS_LESSONS) for (const v of l.variants) {
    const p = fromSketch(lessonSketch(l, v));
    assert.equal(p.tracks.find((t) => t.id === 'bass').steps.length, p.bars * p.spb);
  }
  const pocket = conceptById('pocket');
  const locked = BASS_LESSONS.find((l) => l.id === 'kick');
  assert.equal(pocket.trial.check(fromSketch(lessonSketch(locked, locked.variants[0]))).ok, true);
  assert.equal(pocket.trial.check(fromSketch(lessonSketch(locked, locked.variants[1]))).ok, false);
});

test('notes are spelled the way the key spells them', async () => {
  const { spell, chordSymbol } = await import('../js/theory.js');
  assert.equal(spell(8, 4), 'G#');           // E major
  assert.equal(spell(10, 5), 'Bb');          // F major
  assert.equal(spell(3, 0, 'minor'), 'Eb');  // C minor (relative Eb major)
  assert.equal(chordSymbol('V', 4), 'B');
  assert.equal(chordSymbol('iii', 4), 'G#m');
});

test('In Bloom workbench: power chords, roots, frets', async () => {
  const { BAND_PARTS } = await import('../js/data/bandsongs.js');
  const { lessonSketch } = await import('../js/data/bass.js');
  const { bassFrets } = await import('../js/theory.js');
  assert.equal(chordSymbol('bVI5', 10), 'Gb5');
  assert.equal(chordSymbol('bII5', 10), 'B5');
  assert.equal(chordSymbol('#IV5', 10), 'E5');
  assert.equal(chordSymbol('VI5', 10), 'G5');
  assert.deepEqual(bassFrets(10).filter((x) => 'EA'.includes(x.string)), [{ string: 'A', fret: 1 }, { string: 'E', fret: 6 }]);
  for (const l of BAND_PARTS) for (const v of l.variants) {
    const p = fromSketch(lessonSketch(l, v));
    const bass = p.tracks.find((t) => t.id === 'bass');
    assert.equal(bass.steps.length, p.bars * 16);
    for (let b = 0; b < p.bars; b++) assert.equal(mod12(bass.steps[b * 16]), parseRoman(chordAt(p, b * 16).r).semi, `${l.id}/${v.label} bar ${b + 1}`);
  }
});


test('typed chords: symbols, extensions, slash bass, roman', () => {
  const k = 10; // Bb
  assert.deepEqual(parseChordInput('Ebmaj9', k), { r: 'IVmaj9', b: undefined, sp: 'b' });
  assert.equal(chordSymbol(...Object.values({ r: 'bVI5' }), k, 'major', null, '#'), 'F#5');
  assert.equal(chordTones('IVmaj9', k).join(' '), 'Eb G Bb D F');
  assert.equal(chordTones(parseChordInput('Bb13', k).r, k).join(' '), 'Bb D F Ab C Eb G');
  const fa = parseChordInput('F/A', k);
  assert.equal(chordSymbol(fa.r, k, 'major', fa.b), 'F/A');
  assert.equal(parseChordInput('C#m7b5', 4).r, 'viø7');
  assert.equal(parseChordInput('bVII7', k).r, 'bVII7');
  assert.equal(parseChordInput('nope', k), null);
  // 13ths are thinned for playback but keep their identity
  const n = chordMidi('I13', k);
  assert.ok(n.length <= 5);
});

test('chord events: change on any step, segments per bar', () => {
  const p = newProject({ bars: 2, spb: 16, key: 10, chords: ['I5'] });
  p.chords.push({ s: 6, r: 'bVI5' }, { s: 20, r: 'IV5' });
  sortChords(p);
  assert.equal(chordAt(p, 5).r, 'I5');
  assert.equal(chordAt(p, 6).r, 'bVI5');
  assert.equal(chordAt(p, 17).r, 'I5');
  const segs = chordSegments(p, 0).map((x) => [x.start, x.end, x.ev.r]);
  assert.deepEqual(segs, [[0, 6, 'I5'], [6, 16, 'bVI5']]);
  assert.equal(chordSegments(p, 1)[1].start, 4);
});

test('bars 1-8: new bars copy the last bar, chords included', () => {
  const p = fromSketch({ bars: 2, spb: 16, key: 0, chords: ['I', 'V'], tracks: { kick: { p: 'x...............x.x.............' } } });
  const r = resize(p, 4, 16);
  const kick = r.tracks.find((t) => t.id === 'kick').steps;
  assert.equal(kick.filter(Boolean).length, 1 + 2 * 3);
  assert.deepEqual(r.chords.map((e) => [e.s, e.r]), [[0, 'I'], [16, 'V'], [32, 'V'], [48, 'V']]);
  assert.equal(resize(p, 1, 16).chords.length, 1);
});

test('old projects migrate: chords become events, bass drops into the real register', () => {
  const old = newProject({ bars: 2, key: 10 });
  old.v = undefined;
  old.chords = ['I5', 'bVI5'];
  const bass = old.tracks.find((t) => t.id === 'bass');
  bass.steps[0] = 0; // was Bb2 (36 + 10)
  const m = migrate(old);
  assert.deepEqual(m.chords.map((e) => e.r), ['I5', 'bVI5']);
  assert.equal(bassMidi(m, m.tracks.find((t) => t.id === 'bass').steps[0]), 34); // Bb1: A string, fret 1
});
