// Repertoire list, song anatomy view and the song-map editor.
import { h, mount, toast, select, download, pickFile } from '../ui.js';
import { allSongs, songById, isUnlocked, missingFor, saveSong, deleteSong } from '../library.js';
import { LAYERS, blankSong, SONGS } from '../data/songs.js';
import { conceptById } from '../data/concepts.js';
import { NOTE_NAMES, parseRoman, chordSymbol } from '../theory.js';
import { fromSketch, clone } from '../project.js';
import { playProgression } from '../drills.js';
import { unlockAudio } from '../audio.js';
import { load, update } from '../store.js';
import { loadProject } from './studio.js';

const keyLabel = (s) => (s.key === null || s.key === undefined ? 'key ?' : `${NOTE_NAMES[s.key]} ${s.mode || 'major'}`);
const parseChords = (str) => (str || '').trim().split(/[\s,–-]+/).filter(Boolean);

// ---------- List ----------
export function renderList(el) {
  const songs = allSongs();
  mount(el,
    h('section', { class: 'page' },
      h('header', { class: 'hero' }, h('h1', {}, 'Repertoire'),
        h('p', {}, 'Songs open when you have earned the concepts they are built on. Anything you map yourself is always open.')),
      h('div', { class: 'cards' }, songs.map((s) => {
        const miss = missingFor(s);
        return h('a', { class: 'card song' + (miss.length ? ' locked' : ''), href: `#/song/${s.id}` },
          h('div', { class: 'song-top' }, h('h3', {}, s.title), h('span', { class: 'lock' }, miss.length ? '🔒' : '')),
          h('p', { class: 'artist' }, s.artist),
          h('p', {}, s.lens),
          miss.length ? h('p', { class: 'needs' }, 'Needs: ', miss.map((c) => conceptById(c)?.title).join(' · ')) : null);
      })),
      h('div', { class: 'actions' },
        h('button', { class: 'btn primary', onclick: () => {
          const s = blankSong();
          saveSong(s);
          location.hash = `#/edit/${s.id}`;
        } }, '+ Map a new song'),
        h('button', { class: 'btn', onclick: async () => {
          const txt = await pickFile('.json,application/json');
          if (!txt) return;
          try {
            const s = JSON.parse(txt);
            if (!s.title || !Array.isArray(s.sections)) throw new Error();
            if (!SONGS.find((b) => b.id === s.id)) { s.custom = true; s.id = s.id || 'custom-' + Date.now().toString(36); }
            saveSong(s);
            renderList(el);
            toast(`Imported "${s.title}"`);
          } catch (_) { toast('That file is not a song map'); }
        } }, 'Import map'))));
}

// ---------- Anatomy ----------
function energyCurve(sections) {
  const total = sections.reduce((a, s) => a + (s.bars || 4), 0);
  let x = 0;
  const pts = [];
  for (const s of sections) {
    const w = ((s.bars || 4) / total) * 100;
    pts.push([x + w / 2, 42 - (s.energy || 1) * 7]);
    x += w;
  }
  const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(2) + ' ' + p[1]).join(' ');
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 100 44');
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.setAttribute('class', 'energy');
  svg.innerHTML = `<path d="${d}" fill="none" stroke="currentColor" stroke-width="1.5" vector-effect="non-scaling-stroke"/>` +
    pts.map((p) => `<circle cx="${p[0]}" cy="${p[1]}" r="1.2" fill="currentColor"/>`).join('');
  return svg;
}

function arrangement(song) {
  const total = song.sections.reduce((a, s) => a + (s.bars || 4), 0);
  const col = (s) => ({ flex: `${s.bars || 4} 1 0` });
  return h('div', { class: 'arr' },
    h('div', { class: 'arr-row head' }, h('div', { class: 'arr-label' }, ''),
      h('div', { class: 'arr-cells' }, song.sections.map((s) => h('div', { class: `arr-sec e${s.energy || 1}`, style: col(s) }, h('b', {}, s.name), h('small', {}, `${s.bars || '?'} bars`))))),
    h('div', { class: 'arr-row' }, h('div', { class: 'arr-label' }, 'Energy'), h('div', { class: 'arr-cells curve' }, energyCurve(song.sections))),
    LAYERS.map((l) => h('div', { class: 'arr-row' }, h('div', { class: 'arr-label' }, l.label),
      h('div', { class: 'arr-cells' }, song.sections.map((s) => h('div', { class: 'arr-cell layer-' + l.id + (s.layers?.[l.id] ? ' on' : ''), style: col(s) }))))),
    h('p', { class: 'hint' }, `${total} bars mapped. Coloured cells mean the layer is playing in that section. Look at what switches off right before the big moments.`));
}

function chordStrip(song, s) {
  const chords = parseChords(s.chords);
  if (!chords.length) return h('span', { class: 'muted' }, 'chords: not mapped yet');
  const key = song.key ?? 0;
  const ok = chords.every(parseRoman);
  return h('span', { class: 'chords' },
    chords.map((c) => h('span', { class: 'chord' + (parseRoman(c) ? '' : ' bad') }, h('b', {}, c), parseRoman(c) && h('small', {}, chordSymbol(c, key)))),
    ok && h('button', { class: 'btn ghost small', onclick: async () => { await unlockAudio(); playProgression(chords, key, 120 / (song.bpm || 90)); } }, '▶'));
}

export function renderSong(el, id) {
  const song = songById(id);
  if (!song) return mount(el, h('p', { class: 'page' }, 'Song not found.'));
  const miss = missingFor(song);
  const head = h('header', { class: 'hero' },
    h('a', { class: 'back', href: '#/songs' }, '← Repertoire'),
    h('h1', {}, song.title), h('p', { class: 'artist' }, song.artist),
    h('p', {}, song.lens),
    h('p', { class: 'meta' }, h('span', { class: 'tag' }, keyLabel(song)), h('span', { class: 'tag' }, song.bpm ? `${song.bpm} BPM` : 'BPM ?'),
      song.draft && h('span', { class: 'tag warn', title: 'Section lengths and energy are estimates. Fix them by ear in the editor.' }, 'draft map: verify by ear')));
  if (miss.length) {
    return mount(el, h('section', { class: 'page' }, head,
      h('div', { class: 'locked-box' }, h('h2', {}, '🔒 Locked'),
        h('p', {}, 'Earn these concepts on the Path to open this song:'),
        h('ul', {}, miss.map((c) => h('li', {}, h('a', { href: '#/path' }, conceptById(c)?.title)))))));
  }
  const journal = load().journal[song.id] || {};
  mount(el, h('section', { class: 'page' }, head,
    song.why && h('div', { class: 'why' }, h('h2', {}, 'Why it hits'), h('p', {}, song.why)),
    h('h2', { class: 'section-title' }, 'Arrangement map'),
    arrangement(song),
    h('div', { class: 'sections' }, song.sections.map((s) => h('div', { class: 'sec-detail' },
      h('div', { class: 'sec-name' }, h('b', {}, s.name), h('span', { class: 'muted' }, ` · ${s.bars || '?'} bars · energy ${s.energy}`)),
      chordStrip(song, s),
      s.notes && h('p', {}, s.notes)))),
    song.missions?.length ? h('div', {},
      h('h2', { class: 'section-title' }, 'Listening missions'),
      h('p', { class: 'hint' }, 'Play the real track next to this page. Write what you hear; your answers stay on this device.'),
      song.missions.map((m, i) => h('div', { class: 'mission' },
        h('p', {}, m),
        h('textarea', { rows: 2, placeholder: 'What did you hear?', value: journal[i] || '', oninput: (e) => update((st) => { (st.journal[song.id] ||= {})[i] = e.target.value; }) })))) : null,
    h('div', { class: 'actions' },
      song.sketch && h('button', { class: 'btn primary', onclick: () => { loadProject(fromSketch(song.sketch), 'sketch:' + song.id); location.hash = '#/studio'; } }, `Open sketch: ${song.sketch.name}`),
      h('a', { class: 'btn', href: `#/edit/${song.id}` }, 'Edit map'),
      h('button', { class: 'btn', onclick: () => download(`${song.title}.map.json`, JSON.stringify(song, null, 2), 'application/json') }, 'Export map')),
    song.sketch && h('p', { class: 'hint' }, 'The sketch is a style study in this song\'s world, not a transcription. Rebuild the real parts on top of it.')));
}

// ---------- Editor ----------
export function renderEditor(el, id) {
  const orig = songById(id);
  if (!orig) return mount(el, h('p', { class: 'page' }, 'Song not found.'));
  const song = clone(orig);
  let dirty = false;
  const touch = () => { dirty = true; };
  const field = (label, input) => h('label', { class: 'field wide' }, h('span', {}, label), input);
  const text = (obj, k, attrs = {}) => h('input', { value: obj[k] ?? '', ...attrs, oninput: (e) => { obj[k] = attrs.type === 'number' ? (e.target.value === '' ? null : +e.target.value) : e.target.value; touch(); } });
  const area = (obj, k, rows = 3) => h('textarea', { rows, value: obj[k] || '', oninput: (e) => { obj[k] = e.target.value; touch(); } });

  function draw() {
    mount(el, h('section', { class: 'page editor' },
      h('header', { class: 'hero' }, h('a', { class: 'back', href: `#/song/${song.id}`, onclick: (e) => { if (dirty && !confirm('Leave without saving?')) e.preventDefault(); } }, '← Back'),
        h('h1', {}, 'Map: ' + song.title)),
      h('div', { class: 'form' },
        field('Title', text(song, 'title')),
        field('Artist', text(song, 'artist')),
        h('div', { class: 'row' },
          field('Key', select(song.key ?? '', [['', '?'], ...NOTE_NAMES.map((n, i) => [i, n])], (v) => { song.key = v === '' ? null : +v; touch(); })),
          field('Mode', select(song.mode || 'major', ['major', 'minor'], (v) => { song.mode = v; touch(); })),
          field('BPM', text(song, 'bpm', { type: 'number', min: 30, max: 260 }))),
        field('Lens (genre / production world)', text(song, 'lens')),
        field('Why it hits', area(song, 'why', 4)),
        h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: !!song.draft, onchange: (e) => { song.draft = e.target.checked; touch(); } }), ' Still a draft (not verified by ear)')),
      h('h2', { class: 'section-title' }, 'Sections'),
      h('p', { class: 'hint' }, 'Chords use roman numerals in the song\'s key: I ii iii IV V vi, plus b/# for borrowed (bVII, bVI, iv) and 7/maj7 for colour. Separate them with spaces.'),
      song.sections.map((s, i) => h('div', { class: 'sec-edit' },
        h('div', { class: 'row' },
          h('input', { class: 'grow', value: s.name, oninput: (e) => { s.name = e.target.value; touch(); } }),
          h('input', { class: 'num', type: 'number', min: 1, max: 128, value: s.bars ?? '', title: 'bars', oninput: (e) => { s.bars = +e.target.value || null; touch(); } }),
          h('span', { class: 'muted' }, 'bars')),
        h('label', { class: 'slider' }, h('span', {}, `Energy ${s.energy}`), h('input', { type: 'range', min: 1, max: 5, step: 1, value: s.energy, onchange: (e) => { s.energy = +e.target.value; touch(); draw(); } })),
        h('div', { class: 'row wrap' }, LAYERS.map((l) => h('button', { class: `chip layer-${l.id}` + (s.layers[l.id] ? ' on' : ''), onclick: () => { s.layers[l.id] = !s.layers[l.id]; touch(); draw(); } }, l.label))),
        h('div', { class: 'row' },
          h('input', { class: 'grow', placeholder: 'chords e.g. vi IV I V', value: s.chords || '', onchange: (e) => { s.chords = e.target.value; touch(); draw(); } }),
          chordStrip(song, s)),
        h('textarea', { rows: 2, placeholder: 'What happens here? Why does it work?', value: s.notes || '', oninput: (e) => { s.notes = e.target.value; touch(); } }),
        h('div', { class: 'row' },
          h('button', { class: 'btn ghost small', disabled: i === 0, onclick: () => { [song.sections[i - 1], song.sections[i]] = [song.sections[i], song.sections[i - 1]]; touch(); draw(); } }, '↑'),
          h('button', { class: 'btn ghost small', disabled: i === song.sections.length - 1, onclick: () => { [song.sections[i + 1], song.sections[i]] = [song.sections[i], song.sections[i + 1]]; touch(); draw(); } }, '↓'),
          h('button', { class: 'btn ghost small', onclick: () => { song.sections.splice(i + 1, 0, clone(s)); touch(); draw(); } }, 'Duplicate'),
          h('button', { class: 'btn ghost small', onclick: () => { song.sections.splice(i, 1); touch(); draw(); } }, 'Delete')))),
      h('button', { class: 'btn', onclick: () => { song.sections.push({ name: 'Section', bars: 8, energy: 3, layers: { rhythm: true, bass: true, harmony: true, melody: true, vocal: true, texture: false }, chords: '', notes: '' }); touch(); draw(); } }, '+ Section'),
      h('h2', { class: 'section-title' }, 'Listening missions'),
      (song.missions || []).map((m, i) => h('div', { class: 'row' },
        h('input', { class: 'grow', value: m, oninput: (e) => { song.missions[i] = e.target.value; touch(); } }),
        h('button', { class: 'btn ghost small', onclick: () => { song.missions.splice(i, 1); touch(); draw(); } }, '✕'))),
      h('button', { class: 'btn', onclick: () => { (song.missions ||= []).push(''); touch(); draw(); } }, '+ Mission'),
      h('div', { class: 'actions sticky' },
        h('button', { class: 'btn primary', onclick: () => { saveSong(song); dirty = false; toast('Saved'); location.hash = `#/song/${song.id}`; } }, 'Save'),
        song.custom
          ? h('button', { class: 'btn ghost', onclick: () => { if (confirm('Delete this song map?')) { deleteSong(song); location.hash = '#/songs'; } } }, 'Delete')
          : h('button', { class: 'btn ghost', onclick: () => { if (confirm('Throw away your edits and go back to the original draft?')) { deleteSong(song); location.hash = `#/song/${song.id}`; } } }, 'Revert to draft'))));
  }
  draw();
}
