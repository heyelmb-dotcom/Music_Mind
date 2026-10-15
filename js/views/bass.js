// Bass Lab: one loop, flip the bass approach while it plays, see each note's job.
import { h, mount } from '../ui.js';
import { BASS_LESSONS, lessonSketch } from '../data/bass.js';
import { BAND_SONGS, BAND_PARTS } from '../data/bandsongs.js';
import { fromSketch, chordAt, nextChord, chordSegments, bassMidi } from '../project.js';
import { Player } from '../sequencer.js';
import { unlockAudio } from '../audio.js';
import { chordSymbol, bassRole, spell, parseRoman, bassFrets, bothNames, mod12, degreeName, SCALES } from '../theory.js';
import { labelMode, listProjects, getProjectById, touchProject, openProject, setting } from '../store.js';
import { loadProject, player as studioPlayer, labelToggle, chordLabel } from './studio.js';
import { fretboard } from '../fretboard.js';
import { fingering, cycleFingering } from '../fingering.js';

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

// The label and colour a bass note gets: its job under the chord, or its number in the key.
function noteRole(p, s, v) {
  if (labelMode() === 'key') {
    const cls = mod12(v) === 0 ? 'r-root' : (SCALES[p.mode] || SCALES.major).includes(mod12(v)) ? 'r-fifth' : 'r-approach';
    return { text: degreeName(v), cls };
  }
  const role = bassRole(v, chordAt(p, s).r, nextChord(p, s).r);
  return { text: role, cls: roleClass(role) };
}

function viz(p) {
  const kick = p.tracks.find((t) => t.id === 'kick');
  const bass = p.tracks.find((t) => t.id === 'bass');
  const beatLen = p.spb === 12 ? 3 : 4;
  return h('div', { class: 'bassviz' }, [...Array(p.bars).keys()].map((b) => {
    const cols = { gridTemplateColumns: `repeat(${p.spb}, 1fr)` };
    const kickRow = [], bassRow = [];
    for (let i = 0; i < p.spb; i++) {
      const s = b * p.spb + i;
      const beat = i % beatLen === 0 ? ' beat' : '';
      kickRow.push(h('div', { class: 'bv-cell' + beat + (kick.steps[s] ? ' kick' : ''), 'data-s': s }));
      const v = bass.steps[s];
      if (v === null || v === undefined) bassRow.push(h('div', { class: 'bv-cell' + beat, 'data-s': s }));
      else {
        const r = noteRole(p, s, v);
        const name = spell(p.key + v, p.key, p.mode);
        bassRow.push(h('div', { class: `bv-cell note ${r.cls}` + beat, 'data-s': s, title: name }, h('b', {}, r.text), h('small', {}, name)));
      }
    }
    const chords = chordSegments(p, b).map((seg) => {
      const l = chordLabel(p, seg.ev);
      return h('div', { class: 'bv-chord-block' + (seg.carried ? ' carried' : ''), style: { gridColumn: `${seg.start + 1} / ${seg.end + 1}` }, title: `${l.sym} (${l.roman})` },
        h('b', {}, l.sym), h('small', {}, l.roman));
    });
    return h('div', { class: 'bv-bar' },
      h('div', { class: 'bv-row' }, h('span', { class: 'bv-label' }, b + 1), h('div', { class: 'bv-grid bv-chords', style: cols }, chords)),
      h('div', { class: 'bv-row' }, h('span', { class: 'bv-label' }, 'Kick'), h('div', { class: 'bv-grid', style: cols }, kickRow)),
      h('div', { class: 'bv-row' }, h('span', { class: 'bv-label' }, 'Bass'), h('div', { class: 'bv-grid', style: cols }, bassRow)));
  }));
}

const partTitle = (id) => BAND_PARTS.find((x) => x.id === id)?.title || id;

const LEGEND = [['R', 'root', 'r-root'], ['3', '3rd', 'r-third'], ['5', '5th', 'r-fifth'], ['7', '7th', 'r-seventh'], ['→', 'approach', 'r-approach']];

export function renderList(el) {
  mount(el, h('section', { class: 'page' },
    h('header', { class: 'hero' }, h('h1', {}, 'Bass Lab'),
      h('p', {}, 'How the bass relates to everything else: the kick, the chords and the space. Each lesson plays one loop and lets you swap only the bass while it runs.')),
    h('div', { class: 'lessons' }, BASS_LESSONS.map((l, i) => h('a', { class: 'lesson', href: `#/bass/${l.id}` },
      h('span', { class: 'lesson-n' }, i + 1),
      h('span', {}, h('b', {}, l.title), h('small', {}, l.variants.map((v) => v.label).join(' · ')))))),
    h('h2', { class: 'section-title' }, 'Your projects'),
    h('p', { class: 'hint' }, 'Any Studio project, read like a lesson: chords over your bassline, the neck, and the frets to play. Edits in the Studio show up here.'),
    h('div', { class: 'lessons' }, listProjects().map((p) => h('a', { class: 'lesson', href: `#/bass/p/${p.id}` },
      h('span', { class: 'lesson-n proj-n' }, '▦'),
      h('span', {}, h('b', {}, p.name), h('small', {}, `${spell(p.key, p.key, p.mode)} ${p.mode} · ${p.bars} bar${p.bars > 1 ? 's' : ''}${(p.links || []).length ? ' · linked to ' + p.links.map(partTitle).join(', ') : ''}`))))),
    h('h2', { class: 'section-title' }, 'Your band\'s songs'),
    BAND_SONGS.map((song) => h('div', { class: 'bandsong' },
      h('h3', {}, song.title, h('span', { class: 'muted' }, ' · ' + song.artist)),
      h('p', {}, song.summary),
      h('div', { class: 'lessons' }, song.parts.map((l) => h('a', { class: 'lesson', href: `#/bass/${l.id}` },
        h('span', { class: 'lesson-n band-n' }, '♩'),
        h('span', {}, h('b', {}, l.title.replace(song.title + ': ', '')), h('small', {}, l.variants.map((v) => v.label).join(' · ')))))))),
  ));
}

// Where each chord's root sits on the neck, in the order the loop plays them.
function rootsOnNeck(p) {
  const seen = new Set();
  const items = [];
  for (const r of p.chords) {
    const c = parseRoman(r);
    if (!c || seen.has(r)) continue;
    seen.add(r);
    const pc = mod12(p.key + c.semi);
    const pos = bassFrets(pc).filter((x) => x.string === 'E' || x.string === 'A').sort((a, b) => a.fret - b.fret);
    items.push(h('span', { class: 'fret' }, h('b', {}, bothNames(pc)), h('small', {}, pos.map((x) => `${x.string} string, fret ${x.fret}`).join(' or '))));
  }
  return h('div', { class: 'frets' }, h('div', { class: 'lane-label' }, 'Roots on the neck (standard E A D G tuning)'), h('div', { class: 'fret-list' }, items));
}

export function renderLesson(el, id) {
  const all = [...BASS_LESSONS, ...BAND_PARTS];
  const lesson = all.find((l) => l.id === id);
  const group = lesson?.song ? BAND_PARTS.filter((l) => l.song === lesson.song) : BASS_LESSONS;
  const idx = group.indexOf(lesson);
  const song = lesson?.song ? BAND_SONGS.find((x) => x.id === lesson.song) : null;
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
      labelToggle(drawVariant),
      viz(current),
      labelMode() === 'key'
        ? h('div', { class: 'legend' }, [['1', 'home', 'r-root'], ['2–7', 'in the key', 'r-fifth'], ['b2 #4…', 'outside the key', 'r-approach']].map(([s, l, c]) => h('span', { class: 'lg ' + c }, h('b', {}, s), ' ', l)))
        : h('div', { class: 'legend' }, LEGEND.map(([s, l, c]) => h('span', { class: 'lg ' + c }, h('b', {}, s), ' ', l))),
      rootsOnNeck(current),
      h('div', { class: 'actions' },
        h('button', { class: 'btn', onclick: () => { stop(); loadProject(projects[vi], 'demo:bass-' + lesson.id); location.hash = '#/studio'; } }, 'Open this in Studio')));
  }
  drawVariant();
  const prev = group[idx - 1], next = group[idx + 1];
  mount(el, h('section', { class: 'page' },
    h('header', { class: 'hero' }, h('a', { class: 'back', href: '#/bass' }, '← Bass Lab'),
      h('h1', {}, lesson.title)),
    song && linkedVersions(lesson.id),
    song && h('div', { class: 'draftbox' }, h('b', {}, 'Check by ear: '), song.status,
      h('div', { class: 'row wrap' }, song.sources.map(([label, url]) => h('a', { class: 'chip wide', href: url, target: '_blank', rel: 'noopener' }, label + ' ↗')))),
    h('p', { class: 'idea' }, lesson.idea),
    h('div', { class: 'labbar' }, playBtn, h('span', { class: 'muted' }, `${spell(lesson.loop.key, lesson.loop.key, lesson.loop.mode)} ${lesson.loop.mode} · ${lesson.loop.bpm} BPM${song ? ' (approx.)' : ''} · switch while it plays`)),
    body,
    h('div', { class: 'band' }, h('h3', {}, song ? 'At practice' : 'With your band'), h('p', {}, lesson.band)),
    h('div', { class: 'actions' },
      prev && h('a', { class: 'btn ghost', href: `#/bass/${prev.id}` }, '← ' + prev.title),
      next && h('a', { class: 'btn', href: `#/bass/${next.id}` }, next.title + ' →'))));
  sync();
}

// ---------- Your versions of a band-song part ----------
function linkedVersions(partId) {
  const mine = listProjects().filter((p) => (p.links || []).includes(partId));
  if (!mine.length) {
    return h('p', { class: 'hint' }, 'Built your own version in the Studio? Open it under Bass Lab → Your projects and link it to this part. It will show up here first.');
  }
  return h('div', { class: 'mine' }, h('div', { class: 'lane-label' }, 'Your versions'),
    h('div', { class: 'lessons' }, mine.map((p) => h('a', { class: 'lesson mine-item', href: `#/bass/p/${p.id}` },
      h('span', { class: 'lesson-n proj-n' }, '▦'),
      h('span', {}, h('b', {}, p.name), h('small', {}, `${p.bars} bar${p.bars > 1 ? 's' : ''} · read it, play along, see the frets`))))));
}

// ---------- Read view: any Studio project as a Bass Lab page ----------
export function renderProject(el, id) {
  const live = () => getProjectById(id);
  if (!live()) return mount(el, h('section', { class: 'page' }, h('a', { class: 'back', href: '#/bass' }, '← Bass Lab'), h('p', {}, 'That project no longer exists.')));
  let posNow = null;

  const playBtn = h('button', { class: 'btn play' }, '▶');
  const sync = () => { playBtn.textContent = labPlayer.playing ? '■' : '▶'; playBtn.classList.toggle('on', labPlayer.playing); };
  playBtn.onclick = async () => {
    if (labPlayer.playing) labPlayer.stop();
    else {
      if (studioPlayer.playing) studioPlayer.stop();
      await unlockAudio();
      labPlayer.start(live);
    }
    sync();
  };

  const body = h('div', {});
  function draw() {
    const p = live();
    const frets = setting('frets');
    const fing = fingering(p, frets);
    const bass = p.tracks.find((t) => t.id === 'bass');
    // neck: every position the line uses, labelled by its number in the key (or its job under the chord)
    const marks = {}, labels = {};
    for (const [s, pos] of fing) {
      const k = `${pos.string}:${pos.fret}`;
      marks[k] = 'used';
      labels[k] = labelMode() === 'key' ? degreeName(bass.steps[s]) : noteRole(p, s, bass.steps[s]).text;
    }
    // tab: bar by bar, string and fret for every note, tap to move it
    const tab = [...Array(p.bars).keys()].map((b) => {
      const notes = [...fing].filter(([s]) => Math.floor(s / p.spb) === b);
      return h('div', { class: 'tab-bar' },
        h('div', { class: 'tab-head' }, h('b', {}, `Bar ${b + 1}`), ' ', h('span', { class: 'muted' }, chordSegments(p, b).map((x) => chordLabel(p, x.ev).sym).join(' → '))),
        notes.length ? h('div', { class: 'tab-notes' }, notes.map(([s, pos]) => {
          const r = noteRole(p, s, bass.steps[s]);
          return h('button', { class: 'tab-note', 'data-s': s, title: 'Tap to play this note somewhere else on the neck', onclick: () => {
            cycleFingering(p, s, frets);
            touchProject(p);
            draw();
          } }, h('span', { class: 'tab-str' }, pos.string), h('b', {}, pos.fret), h('small', { class: r.cls }, r.text));
        })) : h('span', { class: 'muted' }, 'rest'));
    });
    const links = p.links || [];
    mount(body,
      labelToggle(draw),
      viz(p),
      h('h2', { class: 'section-title' }, 'On the neck'),
      h('p', { class: 'hint' }, 'Every spot this line uses. The one playing lights up. Fingering keeps your hand close to where it already is; tap a note in the list below to move it.'),
      fretboard({ key: p.key, mode: p.mode, frets, hideKey: true, marks, markLabels: labels }),
      h('h2', { class: 'section-title' }, 'String & fret'),
      h('div', { class: 'tab' }, tab),
      h('h2', { class: 'section-title' }, 'Link to a band song'),
      h('p', { class: 'hint' }, 'Linked projects show up first on that part\'s page.'),
      h('div', { class: 'row wrap' }, BAND_PARTS.map((part) => h('button', {
        class: 'chip wide' + (links.includes(part.id) ? ' on' : ''),
        onclick: () => {
          p.links = links.includes(part.id) ? links.filter((x) => x !== part.id) : [...links, part.id];
          touchProject(p);
          draw();
        },
      }, part.title))));
  }

  labPlayer.onStep = (s) => {
    body.querySelectorAll('.now').forEach((e) => e.classList.remove('now'));
    if (s < 0) return;
    body.querySelectorAll(`[data-s="${s}"]`).forEach((e) => e.classList.add('now'));
    const pos = fingering(live(), setting('frets')).get(s);
    if (pos) posNow = `${pos.string}:${pos.fret}`;
    if (posNow) body.querySelector(`[data-pos="${posNow}"]`)?.classList.add('now');
  };

  const p = live();
  mount(el, h('section', { class: 'page' },
    h('header', { class: 'hero' }, h('a', { class: 'back', href: '#/bass' }, '← Bass Lab'), h('h1', {}, p.name),
      h('p', {}, `${spell(p.key, p.key, p.mode)} ${p.mode} · ${p.bpm} BPM · ${p.bars} bar${p.bars > 1 ? 's' : ''}`)),
    h('div', { class: 'labbar' }, playBtn,
      h('button', { class: 'btn small', onclick: () => { stop(); openProject(id); location.hash = '#/studio'; } }, 'Edit in Studio')),
    body));
  draw();
  sync();
}
