// Bass Lab: one loop, flip the bass approach while it plays, see each note's job.
import { h, mount, sheet, ask, toast, select } from '../ui.js';
import { BASS_LESSONS, lessonSketch } from '../data/bass.js';
import { BAND_SONGS, BAND_PARTS } from '../data/bandsongs.js';
import { fromSketch, chordAt, nextChord, chordSegments, bassMidi, tuningOf, newProject, TUNINGS, lowestOf } from '../project.js';
import { Player } from '../sequencer.js';
import { unlockAudio } from '../audio.js';
import { chordSymbol, bassRole, spell, parseRoman, bassFrets, bothNames, mod12, degreeName, SCALES, NOTE_NAMES } from '../theory.js';
import { labelMode, listProjects, getProjectById, touchProject, openProject, setting, addProject, listBandSongs, getBandSong, saveBandSong, deleteBandSong, newBandSong } from '../store.js';
import { loadProject, player as studioPlayer, labelToggle, chordLabel, tapTempo } from './studio.js';
import { starterSketch } from '../data/banddrafts.js';
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

// Every band-song part a project can link to: the built-in workbench parts and your songs' parts.
export function allParts() {
  return [
    ...BAND_PARTS.map((x) => ({ id: x.id, title: x.title })),
    ...listBandSongs().flatMap((song) => song.parts.map((pt) => ({ id: `${song.id}/${pt.id}`, title: `${song.title}: ${pt.name}` }))),
  ];
}
const partTitle = (id) => allParts().find((x) => x.id === id)?.title || id;
const linkedTo = (partId) => listProjects().filter((p) => (p.links || []).includes(partId));
const linkedCount = (song) => song.parts.filter((pt) => linkedTo(`${song.id}/${pt.id}`).length).length;

const LEGEND = [['R', 'root', 'r-root'], ['3', '3rd', 'r-third'], ['5', '5th', 'r-fifth'], ['7', '7th', 'r-seventh'], ['→', 'approach', 'r-approach']];

export function renderList(el) {
  mount(el, h('section', { class: 'page' },
    h('header', { class: 'hero' }, h('h1', {}, 'Bass Lab'),
      h('p', {}, 'How the bass relates to everything else: the kick, the chords and the space. Each lesson plays one loop and lets you swap only the bass while it runs.')),
    h('div', { class: 'lessons' }, BASS_LESSONS.map((l, i) => h('a', { class: 'lesson', href: `#/bass/${l.id}` },
      h('span', { class: 'lesson-n' }, i + 1),
      h('span', {}, h('b', {}, l.title), h('small', {}, l.variants.map((v) => v.label).join(' · ')))))),
    h('h2', { class: 'section-title' }, 'Your band\'s songs'),
    h('div', { class: 'lessons' },
      BAND_SONGS.map((song) => h('a', { class: 'lesson', href: `#/bass/${song.parts[0].id}` },
        h('span', { class: 'lesson-n band-n' }, '♩'),
        h('span', {}, h('b', {}, song.title), h('small', {}, `${song.artist} · workbench: ${song.parts.length} parts with candidates to check`)))),
      listBandSongs().map((song) => h('a', { class: 'lesson', href: `#/bass/s/${song.id}` },
        h('span', { class: 'lesson-n band-n' }, '♩'),
        h('span', {}, h('b', {}, song.title), h('small', {}, [song.artist, TUNINGS[song.tuning]?.label.replace(/ \(.*\)/, ''), `${song.parts.length} parts`, linkedCount(song) ? `${linkedCount(song)} linked` : song.draft ? 'draft' : ''].filter(Boolean).join(' · ')))))),
    h('div', { class: 'actions' }, h('button', { class: 'btn primary', onclick: () => { const song = newBandSong(); location.hash = `#/bass/s/${song.id}?edit=1`; } }, '+ Add a band song')),
    h('h2', { class: 'section-title' }, 'Your projects'),
    h('p', { class: 'hint' }, 'Any Studio project, read like a lesson: chords over your bassline, the neck, and the frets to play. Edits in the Studio show up here.'),
    h('div', { class: 'lessons' }, listProjects().map((p) => h('a', { class: 'lesson', href: `#/bass/p/${p.id}` },
      h('span', { class: 'lesson-n proj-n' }, '▦'),
      h('span', {}, h('b', {}, p.name), h('small', {}, `${spell(p.key, p.key, p.mode)} ${p.mode} · ${p.bars} bar${p.bars > 1 ? 's' : ''}${(p.links || []).length ? ' · linked to ' + p.links.map(partTitle).join(', ') : ''}`))))),
  ));
}

// Where each chord's root sits on the neck (in the project's tuning), in the order the loop plays them.
function rootsOnNeck(p) {
  const seen = new Set();
  const items = [];
  const strings = tuningOf(p).strings;
  for (const e of p.chords) {
    const c = parseRoman(e.r);
    const semi = e.b ?? c?.semi;
    if (semi === undefined || seen.has(semi)) continue;
    seen.add(semi);
    const pc = mod12(p.key + semi);
    // lowest two places on the two lowest strings
    const pos = strings.slice(0, 2).map(([name, open]) => ({ name, fret: mod12(pc - open) })).sort((a, b) => a.fret - b.fret);
    items.push(h('span', { class: 'fret' }, h('b', {}, bothNames(pc)), h('small', {}, pos.map((x) => `${x.name} string, fret ${x.fret}`).join(' or '))));
  }
  return h('div', { class: 'frets' }, h('div', { class: 'lane-label' }, `Roots on the neck (${tuningOf(p).label})`), h('div', { class: 'fret-list' }, items));
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
      const k = `${pos.idx}:${pos.fret}`;
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
      fretboard({ key: p.key, mode: p.mode, frets, strings: tuningOf(p).strings, hideKey: true, marks, markLabels: labels }),
      h('h2', { class: 'section-title' }, 'String & fret'),
      h('div', { class: 'tab' }, tab),
      h('h2', { class: 'section-title' }, 'Link to a band song'),
      h('p', { class: 'hint' }, 'Linked projects show up first on that part\'s page.'),
      h('div', { class: 'row wrap' },
        links.map((id) => h('button', { class: 'chip wide on', title: 'Tap to unlink', onclick: () => {
          p.links = links.filter((x) => x !== id);
          touchProject(p);
          draw();
        } }, partTitle(id) + '  ✕')),
        h('select', { onchange: (e) => {
          if (!e.target.value) return;
          p.links = [...new Set([...links, e.target.value])];
          touchProject(p);
          draw();
        } }, h('option', { value: '' }, links.length ? '+ Link another part…' : '+ Link to a part…'),
          allParts().filter((x) => !links.includes(x.id)).map((x) => h('option', { value: x.id }, x.title)))));
  }

  labPlayer.onStep = (s) => {
    body.querySelectorAll('.now').forEach((e) => e.classList.remove('now'));
    if (s < 0) return;
    body.querySelectorAll(`[data-s="${s}"]`).forEach((e) => e.classList.add('now'));
    const pos = fingering(live(), setting('frets')).get(s);
    if (pos) posNow = `${pos.idx}:${pos.fret}`;
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

// ---------- A band song: its parts, your versions of each, and where it came from ----------
export function renderBandSong(el, id, params) {
  const song = getBandSong(id);
  if (!song) return mount(el, h('section', { class: 'page' }, h('a', { class: 'back', href: '#/bass' }, '← Bass Lab'), h('p', {}, 'That song is gone.')));
  const t = TUNINGS[song.tuning] || TUNINGS.std;
  const draw = () => renderBandSong(el, id, new URLSearchParams());

  // a new Studio project for this part, in the song's tuning/key, linked straight away
  const startPart = (pt) => {
    const p = fromSketch(starterSketch(song, pt));
    const bass = p.tracks.find((x) => x.id === 'bass');
    const home = lowestOf(p, 0);
    for (let i = 0; i < p.bars * p.spb; i += 2) bass.steps[i] = home;
    bass.voice = 'pluckbass';
    bass.gate = 'normal';
    p.links = [`${song.id}/${pt.id}`];
    loadProject(p);
    location.hash = '#/studio';
  };

  const linkSheet = (pt) => {
    const partId = `${song.id}/${pt.id}`;
    const close = sheet(`Link to ${pt.name}`, h('div', { class: 'menu' },
      h('p', { class: 'hint' }, 'Pick the Studio project that holds your version of this part.'),
      h('div', { class: 'list projects' }, listProjects().map((p) => h('div', { class: 'list-item' },
        h('button', { class: 'link', onclick: () => {
          p.links = [...new Set([...(p.links || []), partId])];
          touchProject(p);
          close();
          draw();
        } }, h('b', {}, p.name), h('small', {}, ` ${spell(p.key, p.key, p.mode)} ${p.mode} · ${p.bars} bars`)))))));
  };

  const partCard = (pt) => {
    const mine = linkedTo(`${song.id}/${pt.id}`);
    return h('div', { class: 'part' },
      h('div', { class: 'part-head' }, h('b', {}, pt.name), pt.note && h('span', { class: 'muted' }, ' · ' + pt.note)),
      mine.length ? h('div', { class: 'lessons' }, mine.map((p) => h('a', { class: 'lesson mine-item', href: `#/bass/p/${p.id}` },
        h('span', { class: 'lesson-n proj-n' }, '▦'),
        h('span', {}, h('b', {}, p.name), h('small', {}, 'read it, play along, see the frets'))))) : h('p', { class: 'hint' }, 'Nothing here yet.'),
      h('div', { class: 'row' },
        h('button', { class: 'btn small' + (mine.length ? '' : ' primary'), onclick: () => startPart(pt) }, mine.length ? 'Start another version' : 'Start in Studio'),
        h('button', { class: 'btn small ghost', onclick: () => linkSheet(pt) }, 'Link a project')));
  };

  mount(el, h('section', { class: 'page' },
    h('header', { class: 'hero' }, h('a', { class: 'back', href: '#/bass' }, '← Bass Lab'),
      h('h1', {}, song.title), h('p', { class: 'artist' }, song.artist),
      h('p', { class: 'meta' },
        h('span', { class: 'tag' }, t.label),
        h('span', { class: 'tag' }, `home ${spell(song.key, song.key, song.mode)} ${song.mode}`),
        h('span', { class: 'tag' }, song.bpm ? `${song.bpm} BPM` : 'BPM: tap it'),
        song.draft && h('span', { class: 'tag warn' }, 'draft: check by ear'))),
    (song.notes || song.sources?.length) && h('div', { class: 'draftbox' },
      song.notes && h('p', {}, song.notes),
      song.sources?.length && h('div', { class: 'row wrap' }, song.sources.map(([label, url]) => h('a', { class: 'chip wide', href: url, target: '_blank', rel: 'noopener' }, label + ' ↗')))),
    h('p', { class: 'hint' }, '"Start in Studio" makes a new project in this tuning and key: a basic beat with the bass on the home note, ready for you to replace with the real part. It shows up here once it exists.'),
    h('div', { class: 'parts' }, song.parts.map(partCard)),
    h('div', { class: 'actions' },
      h('button', { class: 'btn', onclick: () => editSong(song, draw) }, 'Edit song'),
      h('button', { class: 'btn ghost', onclick: async () => {
        if (!(await ask(`Delete "${song.title}"? Your Studio projects stay.`, 'Delete'))) return;
        deleteBandSong(song.id);
        location.hash = '#/bass';
      } }, 'Delete song'))));
  if (params?.get('edit')) editSong(song, draw);
}

function editSong(song, done) {
  const s = JSON.parse(JSON.stringify(song));
  const body = h('div', { class: 'menu' });
  const draw = () => mount(body,
    h('label', { class: 'field wide' }, h('span', {}, 'Title'), h('input', { value: s.title, oninput: (e) => { s.title = e.target.value; } })),
    h('label', { class: 'field wide' }, h('span', {}, 'Artist (if it\'s a cover)'), h('input', { value: s.artist, oninput: (e) => { s.artist = e.target.value; } })),
    h('div', { class: 'row' },
      h('label', { class: 'field grow' }, h('span', {}, 'Tuning'), select(s.tuning, Object.entries(TUNINGS).map(([k, x]) => [k, x.label]), (v) => { s.tuning = v; }))),
    h('div', { class: 'row' },
      h('label', { class: 'field' }, h('span', {}, 'Home'), select(s.key, NOTE_NAMES.map((n, i) => [i, n]), (v) => { s.key = +v; })),
      h('label', { class: 'field' }, h('span', {}, 'Mode'), select(s.mode, ['minor', 'major', 'dorian', 'mixolydian', 'phrygian'], (v) => { s.mode = v; })),
      h('label', { class: 'field' }, h('span', {}, 'BPM'), h('input', { class: 'num', type: 'number', min: 40, max: 260, value: s.bpm ?? '', oninput: (e) => { s.bpm = +e.target.value || null; } })),
      tapTempo((bpm) => { s.bpm = bpm; draw(); })),
    h('label', { class: 'field wide' }, h('span', {}, 'Notes'), h('textarea', { rows: 3, value: s.notes || '', oninput: (e) => { s.notes = e.target.value; } })),
    h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: !!s.draft, onchange: (e) => { s.draft = e.target.checked; } }), ' Still a draft (not checked by ear)'),
    h('h4', {}, 'Parts'),
    s.parts.map((pt, i) => h('div', { class: 'row' },
      h('input', { class: 'grow', value: pt.name, oninput: (e) => { pt.name = e.target.value; } }),
      h('button', { class: 'btn ghost small', disabled: i === 0, onclick: () => { [s.parts[i - 1], s.parts[i]] = [s.parts[i], s.parts[i - 1]]; draw(); } }, '↑'),
      h('button', { class: 'btn ghost small', onclick: () => { s.parts.splice(i, 1); draw(); } }, '✕'))),
    h('button', { class: 'btn small', onclick: () => {
      const n = Math.max(0, ...s.parts.map((x) => +x.id.slice(1) || 0)) + 1;
      s.parts.push({ id: 'p' + n, name: 'Part ' + n, note: '' });
      draw();
    } }, '+ Part'),
    h('div', { class: 'actions' }, h('button', { class: 'btn primary', onclick: () => {
      s.title = s.title.trim() || 'Untitled song';
      saveBandSong(s);
      close();
      toast('Saved');
      done();
    } }, 'Save')));
  draw();
  const close = sheet('Edit song', body);
}
