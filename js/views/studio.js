// The Studio: 8-track step sequencer sandbox.
import { h, mount, ask, sheet, toast, select, shareOrDownload, download, pickFile } from '../ui.js';
import { bassRole, spell, NOTE_NAMES, SCALE_LABELS, chordSymbol, chordMidi, chordRootPc, diatonicChords, BORROWED, inScale, mod12, noteName } from '../theory.js';
import { newProject, fromSketch, resize, clone, isMelodic, emptyStep, NOTE_RANGE, BASE_MIDI, VOICES_BY_KIND } from '../project.js';
import { Player } from '../sequencer.js';
import { unlockAudio, trigger, getAnalyser, getCtx } from '../audio.js';
import { projectToMidi } from '../midi.js';
import { PROGRESSIONS } from '../drills.js';
import { load, update } from '../store.js';
import { DEMOS } from '../data/demos.js';
import { allSongs, isUnlocked } from '../library.js';

export const player = new Player();

let project = null;
let selected = 'kick';
let page = 0;
let scaleLock = true;
let root = null;
let rafSpec = null;

function starter() {
  const p = fromSketch({
    name: 'First loop', bpm: 96, key: 0, mode: 'major', bars: 4, spb: 16, chords: ['I', 'V', 'vi', 'IV'],
    tracks: { kick: { p: 'x.......x.......' }, hat: { p: 'x.x.x.x.x.x.x.x.', vol: 0.4 } },
  });
  p.origin = null;
  return p;
}

export function getProject() {
  if (!project) project = load().project || starter();
  return project;
}

// Replace the whole project (used by demos, sketches, imports).
export function loadProject(p, origin = null) {
  project = clone(p);
  project.origin = origin;
  page = 0;
  if (!project.tracks.find((t) => t.id === selected)) selected = 'kick';
  persist();
}

function persist() {
  update((s) => { s.project = project; });
  if (player.playing) player.syncChannels(project);
}

// Every user edit goes through here.
function commit(rerender = true) {
  project.origin = null;
  persist();
  if (rerender) render();
}

const track = (id) => project.tracks.find((t) => t.id === id);

async function preview(tr, midiOrNull) {
  await unlockAudio();
  player.syncChannels(project);
  const ch = player.channels[tr.id];
  const t = getCtx().currentTime + 0.01;
  if (tr.kind === 'drum') trigger(tr.voice, t, 0, 0, 1, ch.input);
  else if (tr.kind === 'chords') chordMidi(project.chords[page], project.key, BASE_MIDI.chords + 2 + tr.octave * 12).forEach((n) => trigger(tr.voice, t, n, 0.6, 0.55, ch.input));
  else trigger(tr.voice, t, midiOrNull, 0.35, 0.9, ch.input);
}

async function previewChord(r) {
  await unlockAudio();
  const t = getCtx().currentTime + 0.01;
  chordMidi(r, project.key, 55).forEach((n) => trigger('epiano', t, n, 0.8, 0.5));
}

const keyedName = (midi) => spell(midi, project.key, project.mode) + (Math.floor(midi / 12) - 1);

const melodicMidi = (tr, row) => BASE_MIDI[tr.kind] + project.key + row + tr.octave * 12;

// ---------- Transport ----------
function transport() {
  const p = project;
  const playBtn = h('button', { class: 'btn play' + (player.playing ? ' on' : ''), 'aria-label': 'Play' }, player.playing ? '■' : '▶');
  playBtn.onclick = async () => {
    if (player.playing) player.stop();
    else {
      await unlockAudio();
      player.start(() => project);
      startSpectrum();
    }
    playBtn.textContent = player.playing ? '■' : '▶';
    playBtn.classList.toggle('on', player.playing);
  };
  const bpm = h('input', { type: 'number', class: 'num', min: 40, max: 220, value: p.bpm, onchange: (e) => { p.bpm = Math.max(40, Math.min(220, +e.target.value || 96)); commit(); } });
  return h('div', { class: 'transport' },
    playBtn,
    h('label', { class: 'field' }, h('span', {}, 'BPM'), bpm),
    h('label', { class: 'field' }, h('span', {}, 'Key'), select(p.key, NOTE_NAMES.map((n, i) => [i, n]), (v) => { p.key = +v; commit(); })),
    h('label', { class: 'field' }, h('span', {}, 'Scale'), select(p.mode, Object.entries(SCALE_LABELS), (v) => { p.mode = v; commit(); })),
    h('button', { class: 'btn', onclick: projectMenu }, '☰'));
}

// ---------- Chord lane ----------
function chordLane() {
  const p = project;
  return h('div', { class: 'chord-lane' },
    h('div', { class: 'lane-label' }, 'Chords'),
    h('div', { class: 'chord-cells' },
      p.chords.map((r, i) => h('button', { class: 'chord-cell' + (i === page ? ' cur' : ''), onclick: () => chordPicker(i) },
        h('b', {}, r), h('small', {}, chordSymbol(r, p.key, p.mode))))));
}

function chordPicker(bar) {
  const p = project;
  const choose = (r) => {
    p.chords[bar] = r;
    commit();
    previewChord(r);
    close();
  };
  const row = (label, list) => h('div', { class: 'pick-row' }, h('div', { class: 'pick-label' }, label),
    h('div', { class: 'pick-grid' }, list.map((r) => h('button', { class: 'chip' + (p.chords[bar] === r ? ' on' : ''), onclick: () => choose(r) },
      h('b', {}, r), h('small', {}, chordSymbol(r, p.key, p.mode))))));
  const body = h('div', {},
    row(`Diatonic (${SCALE_LABELS[p.mode]})`, diatonicChords(p.mode)),
    row('Diatonic 7ths', diatonicChords(p.mode, true)),
    row('Borrowed & colour', BORROWED.filter((r) => !diatonicChords(p.mode).includes(r))),
    h('div', { class: 'pick-row' }, h('div', { class: 'pick-label' }, 'Whole progression'),
      h('div', { class: 'pick-grid' }, Object.values(PROGRESSIONS).map((pr) => h('button', { class: 'chip wide', onclick: () => {
        p.chords = p.chords.map((_, i) => pr.chords[i % pr.chords.length]);
        if (p.bars < pr.chords.length) toast(`Only ${p.bars} bar(s): set Bars to 4 for the full progression`);
        commit();
        close();
      } }, pr.label)))));
  const close = sheet(`Bar ${bar + 1} chord`, body);
}

// ---------- Tracks ----------
function stepClass(i, v, on) {
  const beat = project.spb === 12 ? 3 : 4;
  return 'cell' + (Math.floor(i / beat) % 2 ? ' alt' : '') + (on ? (v === 0.5 ? ' ghost' : ' on') : '');
}

function trackRow(tr) {
  const p = project;
  const off = page * p.spb;
  const cells = [];
  for (let i = 0; i < p.spb; i++) {
    const s = off + i;
    const v = tr.steps[s];
    const on = isMelodic(tr) ? v !== null && v !== undefined : !!v;
    cells.push(h('button', {
      class: stepClass(i, v, on),
      'data-s': s,
      title: isMelodic(tr) && on ? keyedName(melodicMidi(tr, v)) : '',
      onclick: () => {
        if (tr.kind === 'drum' || tr.kind === 'chords') {
          tr.steps[s] = !v ? 1 : v === 1 ? 0.5 : 0;
          if (tr.steps[s]) preview(tr);
        } else {
          tr.steps[s] = on ? null : (tr._lastRow ?? 0);
          if (!on) preview(tr, melodicMidi(tr, tr.steps[s]));
        }
        selected = tr.id;
        commit();
      },
    }, isMelodic(tr) && on ? h('i', {}, tr.kind === 'bass' ? bassRole(v, p.chords[Math.floor(s / p.spb)], p.chords[(Math.floor(s / p.spb) + 1) % p.bars]) : spell(p.key + v, p.key, p.mode)) : null));
  }
  return h('div', { class: `track layer-${tr.layer}` + (tr.id === selected ? ' sel' : '') + (tr.mute ? ' muted' : '') },
    h('div', { class: 'track-head' },
      h('button', { class: 'track-name', onclick: () => { selected = tr.id; render(); } }, tr.name, h('small', {}, tr.voice)),
      h('button', { class: 'ms' + (tr.mute ? ' on' : ''), onclick: () => { tr.mute = !tr.mute; commit(); } }, 'M'),
      h('button', { class: 'ms solo' + (tr.solo ? ' on' : ''), onclick: () => { tr.solo = !tr.solo; commit(); } }, 'S')),
    h('div', { class: 'steps', style: { gridTemplateColumns: `repeat(${p.spb}, 1fr)` } }, cells));
}

function pager() {
  const p = project;
  if (p.bars < 2) return null;
  return h('div', { class: 'pager' },
    h('span', {}, 'Editing bar'),
    [...Array(p.bars).keys()].map((b) => h('button', { class: 'chip' + (b === page ? ' on' : ''), onclick: () => { page = b; render(); } }, b + 1)));
}

function slider(label, value, min, max, step, oninput) {
  return h('label', { class: 'slider' }, h('span', {}, label),
    h('input', { type: 'range', min, max, step, value, oninput: (e) => oninput(+e.target.value), onchange: () => commit(false) }));
}

function trackPanel() {
  const p = project;
  const tr = track(selected);
  const live = () => { if (player.playing || Object.keys(player.channels).length) player.syncChannels(p); };
  const total = p.bars * p.spb;
  const tools = [
    h('button', { class: 'btn small', onclick: () => { for (let i = 0; i < p.spb; i++) tr.steps[page * p.spb + i] = emptyStep(tr); commit(); } }, 'Clear bar'),
    p.bars > 1 && h('button', { class: 'btn small', onclick: () => {
      const src = tr.steps.slice(page * p.spb, (page + 1) * p.spb);
      for (let s = 0; s < total; s++) tr.steps[s] = src[s % p.spb];
      commit();
      toast(`Bar ${page + 1} copied to all bars`);
    } }, 'Copy bar → all'),
    tr.kind === 'bass' && h('button', { class: 'btn small', onclick: () => {
      for (let b = 0; b < p.bars; b++) tr.steps[b * p.spb] = mod12(chordRootPc(p.chords[b], p.key) - p.key);
      commit();
      toast('Chord roots placed on beat 1 of each bar');
    } }, 'Roots'),
  ];
  return h('div', { class: `panel layer-${tr.layer}` },
    h('div', { class: 'panel-head' }, h('h3', {}, tr.name),
      select(tr.voice, VOICES_BY_KIND[tr.kind], (v) => { tr.voice = v; commit(); preview(tr, isMelodic(tr) ? melodicMidi(tr, 0) : null); })),
    h('div', { class: 'sliders' },
      slider('Vol', tr.vol, 0, 1, 0.01, (v) => { tr.vol = v; live(); }),
      slider('Filter', tr.cutoff, 0, 1, 0.01, (v) => { tr.cutoff = v; live(); }),
      slider('Reverb', tr.reverb, 0, 1, 0.01, (v) => { tr.reverb = v; live(); }),
      slider('Pan', tr.pan, -1, 1, 0.01, (v) => { tr.pan = v; live(); })),
    h('div', { class: 'toggles' },
      tr.kind !== 'drum' && h('button', { class: 'chip' + (tr.duck ? ' on' : ''), title: 'Sidechain: duck this track whenever a kick hits', onclick: () => { tr.duck = !tr.duck; commit(); } }, 'DUCK'),
      tr.kind !== 'drum' && select(tr.gate, [['short', 'Gate: short'], ['normal', 'Gate: normal'], ['legato', 'Gate: legato']], (v) => { tr.gate = v; commit(); }),
      tr.kind !== 'drum' && h('span', { class: 'oct' }, 'Oct',
        h('button', { class: 'chip', onclick: () => { tr.octave = Math.max(-2, tr.octave - 1); commit(); } }, '−'),
        h('b', {}, tr.octave),
        h('button', { class: 'chip', onclick: () => { tr.octave = Math.min(2, tr.octave + 1); commit(); } }, '+')),
      tools),
    isMelodic(tr) ? pianoRoll(tr) : h('p', { class: 'hint' }, tr.kind === 'drum'
      ? 'Tap a step: on → ghost (quiet) → off.'
      : 'Chord hits play the chord set for that bar in the chord lane. Tap: on → soft → off.'));
}

function pianoRoll(tr) {
  const p = project;
  const off = page * p.spb;
  const rows = [];
  for (let r = NOTE_RANGE[tr.kind]; r >= 0; r--) {
    const inside = inScale(r, p.mode);
    if (scaleLock && !inside) continue;
    const isRoot = mod12(r) === 0;
    const midi = melodicMidi(tr, r);
    const cells = [];
    for (let i = 0; i < p.spb; i++) {
      const s = off + i;
      const on = tr.steps[s] === r;
      cells.push(h('button', { class: stepClass(i, 1, on) + (isRoot ? ' rootrow' : ''), 'data-s': s, onclick: () => {
        tr.steps[s] = on ? null : r;
        tr._lastRow = r;
        if (!on) preview(tr, midi);
        commit();
      } }));
    }
    rows.push(h('div', { class: 'roll-row' + (inside ? '' : ' out') },
      h('button', { class: 'roll-key' + (isRoot ? ' root' : ''), onclick: () => { tr._lastRow = r; preview(tr, midi); } }, keyedName(midi)),
      h('div', { class: 'steps', style: { gridTemplateColumns: `repeat(${p.spb}, 1fr)` } }, cells)));
  }
  return h('div', { class: 'roll' },
    h('div', { class: 'roll-tools' },
      h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: scaleLock, onchange: (e) => { scaleLock = e.target.checked; render(); } }), ' Scale lock'),
      h('span', { class: 'hint' }, `Bar ${page + 1} · chord ${p.chords[page]} (${chordSymbol(p.chords[page], p.key, p.mode)}) · highlighted rows are the key note`)),
    rows);
}

// ---------- Spectrum analyser ----------
function spectrum() {
  const c = h('canvas', { class: 'spectrum', width: 600, height: 110 });
  return h('div', { class: 'spec-wrap' }, h('div', { class: 'lane-label' }, 'Spectrum'), c);
}

function startSpectrum() {
  cancelAnimationFrame(rafSpec);
  const draw = () => {
    const c = root && root.querySelector('canvas.spectrum');
    if (!c || !document.body.contains(c)) return;
    const an = getAnalyser();
    const data = new Uint8Array(an.frequencyBinCount);
    an.getByteFrequencyData(data);
    const g = c.getContext('2d');
    const W = (c.width = c.clientWidth * devicePixelRatio), H = (c.height = 110 * devicePixelRatio);
    const css = getComputedStyle(document.documentElement);
    g.clearRect(0, 0, W, H);
    const ny = getCtx().sampleRate / 2;
    const fx = (f) => (Math.log(f / 30) / Math.log(16000 / 30)) * W;
    g.fillStyle = css.getPropertyValue('--accent').trim() || '#7cf';
    const cols = 90;
    for (let i = 0; i < cols; i++) {
      const f0 = 30 * Math.pow(16000 / 30, i / cols), f1 = 30 * Math.pow(16000 / 30, (i + 1) / cols);
      let m = 0;
      for (let b = Math.floor((f0 / ny) * data.length); b <= Math.ceil((f1 / ny) * data.length) && b < data.length; b++) m = Math.max(m, data[b]);
      const bh = (m / 255) * (H - 18 * devicePixelRatio);
      g.fillRect(fx(f0) + 1, H - 16 * devicePixelRatio - bh, Math.max(1, fx(f1) - fx(f0) - 2), bh);
    }
    g.fillStyle = css.getPropertyValue('--muted').trim() || '#888';
    g.font = `${10 * devicePixelRatio}px system-ui`;
    for (const [f, l] of [[60, '60'], [150, '150'], [400, '400'], [1000, '1k'], [3000, '3k'], [8000, '8k']]) g.fillText(l, fx(f) - 6, H - 3 * devicePixelRatio);
    rafSpec = requestAnimationFrame(draw);
  };
  draw();
}

// ---------- Project menu ----------
function projectMenu() {
  const p = project;
  const st = load();
  const songs = allSongs().filter((s) => s.sketch && isUnlocked(s));
  const body = h('div', { class: 'menu' },
    h('label', { class: 'field wide' }, h('span', {}, 'Name'), h('input', { value: p.name, onchange: (e) => { p.name = e.target.value; commit(false); } })),
    h('div', { class: 'row' },
      h('label', { class: 'field' }, h('span', {}, 'Bars'), select(p.bars, [1, 2, 4], (v) => { project = resize(p, +v, p.spb); page = 0; commit(); close(); })),
      h('label', { class: 'field' }, h('span', {}, 'Grid'), select(p.spb, [[16, '16 (straight)'], [12, '12 (triplet)']], (v) => { project = resize(p, p.bars, +v); commit(); close(); })),
      p.spb === 16 && h('label', { class: 'field' }, h('span', {}, 'Swing'), h('input', { type: 'range', min: 0, max: 0.5, step: 0.01, value: p.swing, oninput: (e) => { p.swing = +e.target.value; }, onchange: () => commit(false) }))),
    h('h4', {}, 'Export'),
    h('div', { class: 'row' },
      h('button', { class: 'btn', onclick: () => shareOrDownload(`${p.name || 'sketch'}.mid`, projectToMidi(p, 4), 'audio/midi') }, 'MIDI → Logic'),
      h('button', { class: 'btn', onclick: () => download(`${p.name || 'sketch'}.json`, JSON.stringify(p, null, 2), 'application/json') }, 'Save .json'),
      h('button', { class: 'btn', onclick: async () => {
        const txt = await pickFile('.json,application/json');
        if (!txt) return;
        try { loadProject(JSON.parse(txt)); close(); render(); toast('Loaded'); } catch (_) { toast('That file is not a Music Mind project'); }
      } }, 'Open .json')),
    h('h4', {}, 'On this device'),
    h('div', { class: 'row' },
      h('button', { class: 'btn', onclick: () => { update((s) => { s.saved[p.name] = clone(p); }); toast(`Saved "${p.name}"`); close(); } }, 'Save'),
      h('button', { class: 'btn', onclick: async () => { if (await ask('Start a new empty project? (Unsaved changes will be lost.)')) { loadProject(newProject({ name: 'Untitled', bars: 4, chords: ['I', 'V', 'vi', 'IV'] })); close(); render(); } } }, 'New')),
    Object.keys(st.saved).length ? h('div', { class: 'list' }, Object.keys(st.saved).map((name) => h('div', { class: 'list-item' },
      h('button', { class: 'link', onclick: () => { loadProject(st.saved[name]); close(); render(); } }, name),
      h('button', { class: 'btn ghost small', onclick: async () => { if (await ask(`Delete "${name}"?`)) { update((s) => { delete s.saved[name]; }); close(); } } }, 'Delete')))) : null,
    h('h4', {}, 'Concept demos'),
    h('div', { class: 'row wrap' }, Object.entries(DEMOS).map(([id, d]) => h('button', { class: 'chip wide', onclick: () => { loadProject(fromSketch(d), 'demo:' + id); close(); render(); } }, d.name))),
    h('h4', {}, 'Style sketches (from unlocked songs)'),
    songs.length ? h('div', { class: 'row wrap' }, songs.map((s) => h('button', { class: 'chip wide', onclick: () => { loadProject(fromSketch(s.sketch), 'sketch:' + s.id); close(); render(); } }, `${s.sketch.name} · ${s.title}`))) : h('p', { class: 'hint' }, 'Unlock songs on the Path to get their sketches.'));
  const close = sheet('Project', body);
}

// ---------- Render ----------
export function render(el) {
  if (el) root = el;
  if (!root) return;
  getProject();
  if (page >= project.bars) page = 0;
  const scrollY = window.scrollY;
  mount(root,
    h('div', { class: 'studio' },
      transport(),
      h('div', { class: 'proj-name' }, project.name, project.origin ? h('span', { class: 'tag' }, project.origin.startsWith('demo') ? 'demo' : 'sketch') : null,
        h('span', { class: 'muted' }, ` · ${project.bars} bar${project.bars > 1 ? 's' : ''} · ${project.spb === 12 ? '12/8 grid' : '16ths'}${project.swing ? ` · swing ${Math.round(project.swing * 100)}%` : ''}`)),
      chordLane(),
      pager(),
      h('div', { class: 'tracks' }, project.tracks.map(trackRow)),
      trackPanel(),
      spectrum()));
  window.scrollTo(0, scrollY);
  player.onStep = (s) => {
    if (!root) return;
    root.querySelectorAll('.now').forEach((e) => e.classList.remove('now'));
    if (s >= 0) root.querySelectorAll(`[data-s="${s}"]`).forEach((e) => e.classList.add('now'));
  };
  if (player.playing) startSpectrum();
}

export function unmount() {
  root = null;
  cancelAnimationFrame(rafSpec);
}
