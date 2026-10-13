import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseRoman, chordSymbol, chordMidi, diatonicChords, chordRootPc } from '../js/theory.js';
import { fromSketch, resize, newProject, gateSteps, isMelodic } from '../js/project.js';
import { projectToMidi } from '../js/midi.js';
import { CONCEPTS, conceptById } from '../js/data/concepts.js';
import { SONGS } from '../js/data/songs.js';
import { DEMOS } from '../js/data/demos.js';

test('roman numerals parse against the major scale', () => {
  assert.deepEqual(parseRoman('bVII'), { semi: 10, quality: 'maj', roman: 'bVII' });
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
