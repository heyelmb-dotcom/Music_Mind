// The Studio: 8-track step sequencer sandbox.
import { h, mount, ask, sheet, toast, select, shareOrDownload, download, pickFile } from '../ui.js';
import { bassRole, degreeName, spell, NOTE_NAMES, SCALE_LABELS, chordSymbol, chordMidi, chordTones, parseRoman, parseChordInput, diatonicChords, BORROWED, inScale, mod12 } from '../theory.js';
import { migrate as migrateImport, newProject, fromSketch, resize, clone, isMelodic, emptyStep, NOTE_RANGE, BASE_MIDI, VOICES_BY_KIND, MAX_BARS, chordAt, nextChord, chordSegments, sortChords, bassMidi, bassBase, bassRange, fitBass, BASS_LOW } from '../project.js';
import { Player } from '../sequencer.js';
import { unlockAudio, trigger, getAnalyser, getCtx } from '../audio.js';
import { projectToMidi } from '../midi.js';
import { PROGRESSIONS } from '../drills.js';
import { labelMode, setLabelMode, setting, listProjects, currentProject, addProject, touchProject, openProject, deleteProject } from '../store.js';
import { DEMOS } from '../data/demos.js';
import { allSongs, isUnlocked } from '../library.js';

export const player = new Player();

let project = null;
let selected = 'kick';
let page = 0;
let scaleLock = true;
let root = null;
let rafSpec = null;
let rollScroll = null; // keeps the bass/lead grid scrolled where you left it

function starter() {
  const p = fromSketch({
    name: 'First loop', bpm: 96, key: 0, mode: 'major', bars: 4, spb: 16, chords: ['I', 'V', 'vi', 'IV'],
    tracks: { kick: { p: 'x.......x.......' }, hat: { p: 'x.x.x.x.x.x.x.x.', vol: 0.4 } },
  });
  p.origin = null;
  return p;
}

// The project open in the Studio. Every project lives in the library and autosaves.
export function getProject() {
  project = currentProject() || addProject(starter());
  return project;
}

// Open a copy of a project as a NEW project (demos, sketches, Bass Lab parts, imports).
// Whatever was open stays saved in the library.
export function loadProject(p, origin = null) {
  const copy = clone(p);
  delete copy.id;
  copy.origin = origin;
  project = addProject(copy);
  page = 0;
  rollScroll = null;
  if (!project.tracks.find((t) => t.id === selected)) selected = 'kick';
  if (player.playing) player.syncChannels(project);
}

function persist() {
  touchProject(project);
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
  else if (tr.kind === 'chords') chordMidi(chordAt(project, page * project.spb).r, project.key, BASE_MIDI.chords + 2 + tr.octave * 12).forEach((n) => trigger(tr.voice, t, n, 0.6, 0.55, ch.input));
  else if (tr.kind === 'bass') {
    const mode = setting('bassPlay');
    if (mode !== 'real') trigger(tr.voice, t, midiOrNull + 12, 0.35, mode === 'both' ? 0.6 : 0.9, ch.input);
    if (mode !== 'up') trigger(tr.voice, t, midiOrNull, 0.35, 0.9, ch.input);
  } else trigger(tr.voice, t, midiOrNull, 0.35, 0.9, ch.input);
}

async function previewChord(r) {
  await unlockAudio();
  const t = getCtx().currentTime + 0.01;
  chordMidi(r, project.key, 55).forEach((n) => trigger('epiano', t, n, 0.8, 0.5));
}

const keyedName = (midi) => spell(midi, project.key, project.mode) + (Math.floor(midi / 12) - 1);

// What a melodic step shows: its degree in the key (Key labels), its job under the chord (bass, Chord labels), or its name.
function stepLabel(tr, s, v) {
  const p = project;
  if (labelMode() === 'key') return degreeName(v);
  if (tr.kind === 'bass') return bassRole(v, chordAt(p, s).r, nextChord(p, s).r);
  return spell(p.key + v, p.key, p.mode);
}

// How a chord event reads: the symbol (Bb5, F/A) and its number in the key (I5, V/3).
export function chordLabel(p, ev) {
  const hasBass = ev.b !== undefined && ev.b !== null;
  return {
    sym: chordSymbol(ev.r, p.key, p.mode, hasBass ? ev.b : null, ev.sp),
    roman: ev.r + (hasBass ? '/' + bassRole(ev.b, ev.r) : ''),
  };
}

export function labelToggle(onchange) {
  const cur = labelMode();
  return h('div', { class: 'seg small', title: 'How notes are labelled' }, [['chord', 'Chord: R 3 5'], ['key', 'Key: 1–7']].map(([id, label]) =>
    h('button', { class: 'seg-btn' + (cur === id ? ' on' : ''), onclick: () => { setLabelMode(id); onchange(); } }, label)));
}

const melodicMidi = (tr, row) => (tr.kind === 'bass' ? bassMidi(project, row) : BASE_MIDI[tr.kind] + project.key + row + tr.octave * 12);

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
    h('label', { class: 'field' }, h('span', {}, 'Key'), select(p.key, NOTE_NAMES.map((n, i) => [i, n]), (v) => { p.key = +v; fitBass(p, setting('frets')); commit(); })),
    h('label', { class: 'field' }, h('span', {}, 'Scale'), select(p.mode, Object.entries(SCALE_LABELS), (v) => { p.mode = v; commit(); })),
    h('button', { class: 'btn', onclick: projectMenu }, '☰'));
}

// ---------- Chord track ----------
// Chords are blocks on the same step grid as the drums. Tap anywhere in a block to start
// a new chord on that step; tap a block's first step to change or remove that chord.
function chordLane() {
  const p = project;
  const cols = { gridTemplateColumns: `repeat(${p.spb}, 1fr)` };
  const blocks = chordSegments(p, page).map((seg) => {
    const lbl = chordLabel(p, seg.ev);
    const span = seg.end - seg.start;
    const el = h('button', {
      class: 'chord-block' + (seg.carried ? ' carried' : '') + (span <= 2 ? ' tight' : ''),
      style: { gridColumn: `${seg.start + 1} / ${seg.end + 1}` },
      title: `${lbl.sym} (${lbl.roman})`,
    }, h('b', {}, lbl.sym), h('small', {}, lbl.roman));
    el.onclick = (e) => {
      const r = el.getBoundingClientRect();
      const i = Math.min(span - 1, Math.max(0, Math.floor(((e.clientX - r.left) / r.width) * span)));
      chordPicker(page * p.spb + seg.start + i);
    };
    return el;
  });
  const ticks = [];
  for (let i = 0; i < p.spb; i++) ticks.push(h('span', { class: 'tick' + (i % (p.spb === 12 ? 3 : 4) === 0 ? ' beat' : ''), 'data-s': page * p.spb + i }));
  return h('div', { class: 'chord-lane' },
    h('div', { class: 'lane-label' }, 'Chords', h('span', { class: 'chord-now' }, '')),
    h('div', { class: 'chord-track', style: cols }, blocks),
    h('div', { class: 'chord-ticks', style: cols }, ticks));
}

async function previewChordAt(r) {
  await unlockAudio();
  const t = getCtx().currentTime + 0.01;
  chordMidi(r, project.key, 55).forEach((n) => trigger('epiano', t, n, 0.8, 0.5));
}

function chordPicker(step) {
  const p = project;
  const existing = p.chords.find((e) => e.s === step);
  const sounding = chordAt(p, step);
  const set = (r, b, sp) => {
    p.chords = p.chords.filter((e) => e.s !== step);
    const ev = { s: step, r };
    if (b !== undefined && b !== null) ev.b = b;
    if (sp) ev.sp = sp;
    p.chords.push(ev);
    sortChords(p);
    commit();
    previewChordAt(r);
    close();
  };
  // typed chord with a live read-out of what it means
  const out = h('div', { class: 'type-out' });
  const useBtn = h('button', { class: 'btn primary', disabled: true }, 'Use');
  let parsed = null;
  const input = h('input', {
    class: 'grow', placeholder: 'Type a chord: Bb13, C#m7b5, F/A, bVII7…', autocapitalize: 'off', autocorrect: 'off', spellcheck: false,
    oninput: (e) => {
      parsed = parseChordInput(e.target.value, p.key);
      useBtn.disabled = !parsed;
      if (!e.target.value.trim()) return mount(out);
      if (!parsed) return mount(out, h('span', { class: 'muted' }, "Not a chord I can read yet. Try a letter name plus a suffix, e.g. Ebmaj9."));
      const lbl = chordLabel(p, parsed);
      mount(out, h('b', {}, lbl.sym), h('span', { class: 'muted' }, ` · ${lbl.roman} in ${spell(p.key, p.key, p.mode)} · `), chordTones(parsed.r, p.key, p.mode).join(' '));
    },
    onkeydown: (e) => { if (e.key === 'Enter' && parsed) set(parsed.r, parsed.b, parsed.sp); },
  });
  useBtn.onclick = () => parsed && set(parsed.r, parsed.b, parsed.sp);
  const row = (label, list) => h('div', { class: 'pick-row' }, h('div', { class: 'pick-label' }, label),
    h('div', { class: 'pick-grid' }, list.map((r) => h('button', { class: 'chip' + (existing && existing.r === r && existing.b == null ? ' on' : ''), onclick: () => set(r) },
      h('b', {}, chordSymbol(r, p.key, p.mode)), h('small', {}, r)))));
  const cur = chordLabel(p, sounding);
  const body = h('div', {},
    h('p', { class: 'muted' }, existing ? `Changing ${cur.sym} (${cur.roman}).` : `${cur.sym} is sounding here. Pick a chord to start on this step.`),
    h('div', { class: 'row' }, input, useBtn), out,
    row(`In the key (${SCALE_LABELS[p.mode]})`, diatonicChords(p.mode)),
    row('Sevenths', diatonicChords(p.mode, true)),
    row('Borrowed & colour', BORROWED.filter((r) => !diatonicChords(p.mode).includes(r))),
    existing && step !== 0 && h('div', { class: 'actions' }, h('button', { class: 'btn ghost', onclick: () => {
      p.chords = p.chords.filter((e) => e !== existing);
      sortChords(p); commit(); close();
    } }, 'Remove this chord change')),
    h('div', { class: 'pick-row' }, h('div', { class: 'pick-label' }, 'Whole progression (one chord per bar, replaces all changes)'),
      h('div', { class: 'pick-grid' }, Object.values(PROGRESSIONS).map((pr) => h('button', { class: 'chip wide', onclick: () => {
        p.chords = Array.from({ length: p.bars }, (_, i) => ({ s: i * p.spb, r: pr.chords[i % pr.chords.length] }));
        sortChords(p); commit(); close();
      } }, pr.label)))));
  const close = sheet(`Bar ${Math.floor(step / p.spb) + 1}, step ${(step % p.spb) + 1}`, body);
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
    }, isMelodic(tr) && on ? h('i', {}, stepLabel(tr, s, v)) : null));
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
      // the lowest place on the neck for each chord's root (or its slash note)
      for (const e of p.chords) {
        const pc = e.b ?? parseRoman(e.r).semi;
        tr.steps[e.s] = BASS_LOW + mod12(p.key + pc - 4) - bassBase(p.key);
      }
      commit();
      toast('Roots placed at every chord change');
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
      tr.kind !== 'drum' && tr.kind !== 'bass' && h('span', { class: 'oct' }, 'Oct',
        h('button', { class: 'chip', onclick: () => { tr.octave = Math.max(-2, tr.octave - 1); commit(); } }, '−'),
        h('b', {}, tr.octave),
        h('button', { class: 'chip', onclick: () => { tr.octave = Math.min(2, tr.octave + 1); commit(); } }, '+')),
      tools),
    isMelodic(tr) ? pianoRoll(tr) : h('p', { class: 'hint' }, tr.kind === 'drum'
      ? 'Tap a step: on → ghost (quiet) → off.'
      : 'Chord hits play whatever chord is sounding in the chord track. Tap: on → soft → off.'));
}

function pianoRoll(tr) {
  const p = project;
  const off = page * p.spb;
  const isBass = tr.kind === 'bass';
  const [lo, hi] = isBass ? bassRange(p, setting('frets')) : [0, NOTE_RANGE.lead];
  const rows = [];
  for (let r = hi; r >= lo; r--) {
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
  const scroller = h('div', { class: 'roll-scroll', onscroll: (e) => { rollScroll = e.target.scrollTop; } }, rows);
  // open at the low end (where basslines live) the first time, then stay where you left it
  requestAnimationFrame(() => { scroller.scrollTop = rollScroll ?? scroller.scrollHeight; });
  const cur = chordLabel(p, chordAt(p, off));
  return h('div', { class: 'roll' },
    h('div', { class: 'roll-tools' },
      h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: scaleLock, onchange: (e) => { scaleLock = e.target.checked; render(); } }), ' Scale lock'),
      h('span', { class: 'hint' }, isBass
        ? `Low E to fret ${setting('frets')}, at the pitch you play it · bar ${page + 1} starts on ${cur.sym}`
        : `Bar ${page + 1} starts on ${cur.sym} · highlighted rows are the key note`)),
    scroller);
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
const ago = (t) => {
  const m = Math.round((Date.now() - (t || 0)) / 60000);
  return m < 1 ? 'just now' : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} d ago`;
};

function projectMenu() {
  const p = project;
  const songs = allSongs().filter((s) => s.sketch && isUnlocked(s));
  const reopen = () => { close(); render(); };
  const body = h('div', { class: 'menu' },
    h('label', { class: 'field wide' }, h('span', {}, 'Name'), h('input', { value: p.name, onchange: (e) => { p.name = e.target.value || 'Untitled'; commit(); } })),
    h('div', { class: 'row' },
      h('label', { class: 'field' }, h('span', {}, 'Bars'), select(p.bars, [...Array(MAX_BARS).keys()].map((i) => i + 1), (v) => { const id = p.id; Object.assign(p, resize(p, +v, p.spb), { id }); page = Math.min(page, p.bars - 1); commit(); reopen(); })),
      h('label', { class: 'field' }, h('span', {}, 'Grid'), select(p.spb, [[16, '16 (straight)'], [12, '12 (triplet)']], (v) => { const id = p.id; Object.assign(p, resize(p, p.bars, +v), { id }); commit(); reopen(); })),
      p.spb === 16 && h('label', { class: 'field' }, h('span', {}, 'Swing'), h('input', { type: 'range', min: 0, max: 0.5, step: 0.01, value: p.swing, oninput: (e) => { p.swing = +e.target.value; }, onchange: () => commit(false) }))),
    h('h4', {}, 'Projects'),
    h('p', { class: 'hint' }, 'Everything saves as you go. Opening another project never overwrites this one.'),
    h('div', { class: 'row' },
      h('button', { class: 'btn', onclick: () => { loadProject(newProject({ name: 'Untitled', bars: 4, chords: ['I', 'V', 'vi', 'IV'] })); reopen(); } }, 'New'),
      h('button', { class: 'btn', onclick: () => { loadProject({ ...p, name: p.name + ' copy' }); toast('Duplicated. You are now in the copy.'); reopen(); } }, 'Duplicate')),
    h('div', { class: 'list projects' }, listProjects().map((x) => h('div', { class: 'list-item' + (x.id === p.id ? ' cur' : '') },
      h('button', { class: 'link', onclick: () => { openProject(x.id); page = 0; rollScroll = null; reopen(); } },
        h('b', {}, x.name), h('small', {}, ` ${spell(x.key, x.key, x.mode)} ${x.mode} · ${x.bars} bar${x.bars > 1 ? 's' : ''} · ${ago(x.updated)}`)),
      h('button', { class: 'btn ghost small', onclick: async () => {
        if (!(await ask(`Delete "${x.name}"? This can't be undone.`, 'Delete'))) return;
        deleteProject(x.id);
        reopen();
      } }, 'Delete')))),
    h('h4', {}, 'Export'),
    h('div', { class: 'row' },
      h('button', { class: 'btn', onclick: () => shareOrDownload(`${p.name || 'sketch'}.mid`, projectToMidi(p, 4), 'audio/midi') }, 'MIDI → Logic'),
      h('button', { class: 'btn', onclick: () => download(`${p.name || 'sketch'}.json`, JSON.stringify(p, null, 2), 'application/json') }, 'Save .json'),
      h('button', { class: 'btn', onclick: async () => {
        const txt = await pickFile('.json,application/json');
        if (!txt) return;
        try { loadProject(migrateImport(JSON.parse(txt))); reopen(); toast('Opened as a new project'); } catch (_) { toast('That file is not a Music Mind project'); }
      } }, 'Open .json')),
    h('h4', {}, 'Concept demos (open as new projects)'),
    h('div', { class: 'row wrap' }, Object.entries(DEMOS).map(([id, d]) => h('button', { class: 'chip wide', onclick: () => { loadProject(fromSketch(d), 'demo:' + id); reopen(); } }, d.name))),
    h('h4', {}, 'Style sketches (from unlocked songs)'),
    songs.length ? h('div', { class: 'row wrap' }, songs.map((s) => h('button', { class: 'chip wide', onclick: () => { loadProject(fromSketch(s.sketch), 'sketch:' + s.id); reopen(); } }, `${s.sketch.name} · ${s.title}`))) : h('p', { class: 'hint' }, 'Unlock songs on the Path to get their sketches.'));
  const close = sheet('Project', body);
}

// ---------- Render ----------
export function render(el) {
  if (el) root = el;
  if (!root) return;
  getProject();
  if (page >= project.bars) page = 0;
  if (!project.tracks.find((t) => t.id === selected)) selected = 'kick';
  const scrollY = window.scrollY;
  mount(root,
    h('div', { class: 'studio' },
      transport(),
      h('div', { class: 'proj-name' }, project.name, project.origin ? h('span', { class: 'tag' }, project.origin.startsWith('demo') ? 'demo' : 'sketch') : null,
        h('span', { class: 'muted' }, ` · ${project.bars} bar${project.bars > 1 ? 's' : ''} · ${project.spb === 12 ? '12/8 grid' : '16ths'}${project.swing ? ` · swing ${Math.round(project.swing * 100)}%` : ''}`)),
      labelToggle(() => render()),
      chordLane(),
      pager(),
      h('div', { class: 'tracks' }, project.tracks.map(trackRow)),
      trackPanel(),
      spectrum()));
  window.scrollTo(0, scrollY);
  player.onStep = (s) => {
    if (!root) return;
    root.querySelectorAll('.now').forEach((e) => e.classList.remove('now'));
    const readout = root.querySelector('.chord-now');
    if (s >= 0) {
      root.querySelectorAll(`[data-s="${s}"]`).forEach((e) => e.classList.add('now'));
      if (readout) { const l = chordLabel(project, chordAt(project, s)); readout.textContent = ` · now ${l.sym} (${l.roman})`; }
    } else if (readout) readout.textContent = '';
  };
  if (player.playing) startSpectrum();
}

export function unmount() {
  root = null;
  cancelAnimationFrame(rafSpec);
}
