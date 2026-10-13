// Bass Lab: one loop, flip the bass approach while it plays, see each note's job.
import { h, mount } from '../ui.js';
import { BASS_LESSONS, lessonSketch } from '../data/bass.js';
import { fromSketch } from '../project.js';
import { Player } from '../sequencer.js';
import { unlockAudio } from '../audio.js';
import { NOTE_NAMES, chordSymbol, bassRole, spell } from '../theory.js';
import { loadProject, player as studioPlayer } from './studio.js';

const labPlayer = new Player();
let current = null;

export function stop() {
  if (labPlayer.playing) labPlayer.stop();
}

function roleClass(role) {
  if (role === 'R') return 'r-root';
  if (role === '5') return 'r-fifth';
  if (role === '3' || role === '♭3') return 'r-third';
  if (role === '→') return 'r-approach';
  if (role === '7' || role === '♭7') return 'r-seventh';
  return 'r-other';
}

function viz(p) {
  const kick = p.tracks.find((t) => t.id === 'kick');
  const bass = p.tracks.find((t) => t.id === 'bass');
  return h('div', { class: 'bassviz' }, [...Array(p.bars).keys()].map((b) => {
    const chord = p.chords[b];
    const next = p.chords[(b + 1) % p.bars];
    const cols = { gridTemplateColumns: `repeat(${p.spb}, 1fr)` };
    const kickRow = [], bassRow = [];
    for (let i = 0; i < p.spb; i++) {
      const s = b * p.spb + i;
      const beat = i % 4 === 0 ? ' beat' : '';
      kickRow.push(h('div', { class: 'bv-cell' + beat + (kick.steps[s] ? ' kick' : ''), 'data-s': s }));
      const v = bass.steps[s];
      if (v === null || v === undefined) bassRow.push(h('div', { class: 'bv-cell' + beat, 'data-s': s }));
      else {
        const role = bassRole(v, chord, next);
        bassRow.push(h('div', { class: `bv-cell note ${roleClass(role)}` + beat, 'data-s': s, title: spell(p.key + v, p.key, p.mode) },
          h('b', {}, role), h('small', {}, spell(p.key + v, p.key, p.mode))));
      }
    }
    return h('div', { class: 'bv-bar' },
      h('div', { class: 'bv-chord' }, h('b', {}, chord), ' ', h('span', { class: 'muted' }, chordSymbol(chord, p.key, p.mode))),
      h('div', { class: 'bv-row' }, h('span', { class: 'bv-label' }, 'Kick'), h('div', { class: 'bv-grid', style: cols }, kickRow)),
      h('div', { class: 'bv-row' }, h('span', { class: 'bv-label' }, 'Bass'), h('div', { class: 'bv-grid', style: cols }, bassRow)));
  }));
}

const LEGEND = [['R', 'root', 'r-root'], ['3', '3rd', 'r-third'], ['5', '5th', 'r-fifth'], ['7', '7th', 'r-seventh'], ['→', 'approach', 'r-approach']];

export function renderList(el) {
  mount(el, h('section', { class: 'page' },
    h('header', { class: 'hero' }, h('h1', {}, 'Bass Lab'),
      h('p', {}, 'How the bass relates to everything else: the kick, the chords and the space. Each lesson plays one loop and lets you swap only the bass while it runs.')),
    h('div', { class: 'lessons' }, BASS_LESSONS.map((l, i) => h('a', { class: 'lesson', href: `#/bass/${l.id}` },
      h('span', { class: 'lesson-n' }, i + 1),
      h('span', {}, h('b', {}, l.title), h('small', {}, l.variants.map((v) => v.label).join(' · '))))))));
}

export function renderLesson(el, id) {
  const idx = BASS_LESSONS.findIndex((l) => l.id === id);
  const lesson = BASS_LESSONS[idx];
  if (!lesson) return mount(el, h('p', { class: 'page' }, 'Lesson not found.'));
  let vi = 0;
  const projects = lesson.variants.map((v) => fromSketch(lessonSketch(lesson, v)));
  current = projects[0];

  const playBtn = h('button', { class: 'btn play' }, '▶');
  const sync = () => { playBtn.textContent = labPlayer.playing ? '■' : '▶'; playBtn.classList.toggle('on', labPlayer.playing); };
  playBtn.onclick = async () => {
    if (labPlayer.playing) labPlayer.stop();
    else {
      if (studioPlayer.playing) studioPlayer.stop();
      await unlockAudio();
      labPlayer.start(() => current);
    }
    sync();
  };
  const body = h('div', {});
  labPlayer.onStep = (s) => {
    body.querySelectorAll('.now').forEach((e) => e.classList.remove('now'));
    if (s >= 0) body.querySelectorAll(`[data-s="${s}"]`).forEach((e) => e.classList.add('now'));
  };

  function drawVariant() {
    const v = lesson.variants[vi];
    current = projects[vi];
    if (labPlayer.playing) labPlayer.syncChannels(current);
    mount(body,
      h('div', { class: 'variants' }, lesson.variants.map((x, i) => h('button', { class: 'variant' + (i === vi ? ' on' : ''), onclick: () => { vi = i; drawVariant(); } },
        h('span', { class: 'v-letter' }, String.fromCharCode(65 + i)), x.label))),
      h('p', { class: 'what' }, v.what),
      viz(current),
      h('div', { class: 'legend' }, LEGEND.map(([s, l, c]) => h('span', { class: 'lg ' + c }, h('b', {}, s), ' ', l))),
      h('div', { class: 'actions' },
        h('button', { class: 'btn', onclick: () => { stop(); loadProject(projects[vi], 'demo:bass-' + lesson.id); location.hash = '#/studio'; } }, 'Open this in Studio')));
  }
  drawVariant();
  const prev = BASS_LESSONS[idx - 1], next = BASS_LESSONS[idx + 1];
  mount(el, h('section', { class: 'page' },
    h('header', { class: 'hero' }, h('a', { class: 'back', href: '#/bass' }, '← Bass Lab'),
      h('h1', {}, lesson.title)),
    h('p', { class: 'idea' }, lesson.idea),
    h('div', { class: 'labbar' }, playBtn, h('span', { class: 'muted' }, `${NOTE_NAMES[lesson.loop.key]} ${lesson.loop.mode} · ${lesson.loop.bpm} BPM · switch while it plays`)),
    body,
    h('div', { class: 'band' }, h('h3', {}, 'With your band'), h('p', {}, lesson.band)),
    h('div', { class: 'actions' },
      prev && h('a', { class: 'btn ghost', href: `#/bass/${prev.id}` }, '← ' + prev.title),
      next && h('a', { class: 'btn', href: `#/bass/${next.id}` }, next.title + ' →'))));
  sync();
}
