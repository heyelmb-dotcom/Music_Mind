// Local persistence. Everything lives on this device; export/import for backups.
import { migrate } from './project.js';
import { BAND_DRAFTS } from './data/banddrafts.js';

const KEY = 'musicmind.v1';
export const DEFAULT_SETTINGS = { bassPlay: 'up', frets: 20 };

const defaults = () => ({
  concepts: {}, // id -> { passed: true, at: ISO date }
  keys: {}, // '10-major' (pitch class-mode) -> ISO date the neck quiz was passed
  labels: 'chord', // how notes are labelled: 'chord' (R 3 5) or 'key' (1-7)
  journal: {}, // songId -> { missionIndex: text }
  songEdits: {}, // songId -> full song map overriding the built-in draft
  customSongs: [], // songs you mapped from scratch
  projects: {}, // id -> Studio project (every project autosaves)
  currentId: null, // the project open in the Studio
  settings: { ...DEFAULT_SETTINGS }, // bassPlay: 'up' | 'real' | 'both', frets: 20 | 22
  bandSongs: {}, // id -> band song { title, artist, tuning, key, mode, bpm, notes, sources, parts: [{ id, name, note }] }
  seeded: {}, // which built-in drafts have been copied in (so deleting one sticks)
});

const newId = () => 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

// Older saves kept one current project plus a name -> project map; fold both into the library.
function upgrade(st) {
  const before = JSON.stringify(st);
  const add = (p) => {
    if (!p || !p.tracks) return null;
    const id = p.id || newId();
    st.projects[id] = { ...migrate(p), id, updated: p.updated || Date.now() };
    return id;
  };
  for (const id of Object.keys(st.projects)) st.projects[id] = migrate(st.projects[id]);
  if (st.project) { st.currentId = add(st.project); delete st.project; }
  if (st.saved) {
    for (const [name, p] of Object.entries(st.saved)) add({ ...p, name });
    delete st.saved;
  }
  st.settings = { ...DEFAULT_SETTINGS, ...(st.settings || {}) };
  st.bandSongs = st.bandSongs || {};
  st.seeded = st.seeded || {};
  if (!st.seeded.bandDrafts1) {
    for (const d of BAND_DRAFTS) if (!st.bandSongs[d.id]) st.bandSongs[d.id] = JSON.parse(JSON.stringify({ ...d, created: Date.now() }));
    st.seeded.bandDrafts1 = true;
  }
  st._upgraded = JSON.stringify(st) !== before;
  return st;
}

let state = null;

export function load() {
  if (state) return state;
  try {
    const raw = localStorage.getItem(KEY);
    state = upgrade(raw ? { ...defaults(), ...JSON.parse(raw) } : defaults());
  } catch (_) {
    state = upgrade(defaults()); // storage blocked: still start with the drafts
  }
  // write the upgraded shape straight away so ids and migrated notes stay stable
  if (state._upgraded) save();
  delete state._upgraded;
  return state;
}

let saveTimer = null;
export function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (_) { /* storage full or blocked */ }
  }, 150);
}

export function update(fn) {
  fn(load());
  save();
}

export function exportAll() {
  return JSON.stringify(load(), null, 2);
}

export function importAll(json) {
  const data = JSON.parse(json);
  state = upgrade({ ...defaults(), ...data });
  save();
}

export function resetProgress() {
  update((s) => { s.concepts = {}; });
}

export const isPassed = (id) => !!load().concepts[id]?.passed;

export function markPassed(id) {
  update((s) => { s.concepts[id] = { passed: true, at: new Date().toISOString() }; });
}

export const keyId = (pc, mode) => `${pc}-${mode}`;
export const isKeyMastered = (pc, mode) => !!load().keys[keyId(pc, mode)];
export function markKey(pc, mode) {
  update((s) => { s.keys[keyId(pc, mode)] = new Date().toISOString(); });
}
export const labelMode = () => load().labels || 'chord';
export function setLabelMode(m) { update((s) => { s.labels = m; }); }

// ---------- Settings ----------
export const setting = (k) => load().settings?.[k] ?? DEFAULT_SETTINGS[k];
export function setSetting(k, v) { update((s) => { s.settings[k] = v; }); }

// ---------- Project library ----------
export const listProjects = () => Object.values(load().projects).sort((a, b) => (b.updated || 0) - (a.updated || 0));
export const getProjectById = (id) => load().projects[id] || null;
export const currentProject = () => getProjectById(load().currentId);

// Add a project to the library (never replaces another) and optionally open it.
export function addProject(p, open = true) {
  const id = newId();
  update((s) => {
    s.projects[id] = { ...p, id, updated: Date.now() };
    if (open) s.currentId = id;
  });
  return load().projects[id];
}

// Mark a project as edited and write it out (it is already the stored object).
export function touchProject(p) {
  p.updated = Date.now();
  update((s) => { s.projects[p.id] = p; });
}

export function openProject(id) { update((s) => { s.currentId = id; }); }

export function deleteProject(id) {
  update((s) => {
    delete s.projects[id];
    if (s.currentId === id) s.currentId = listProjects()[0]?.id || null;
  });
}

// ---------- Band songs ----------
export const listBandSongs = () => Object.values(load().bandSongs).sort((a, b) => a.title.localeCompare(b.title));
export const getBandSong = (id) => load().bandSongs[id] || null;
export function saveBandSong(song) { update((s) => { s.bandSongs[song.id] = song; }); }
export function deleteBandSong(id) { update((s) => { delete s.bandSongs[id]; }); }
export function newBandSong() {
  const id = 'song' + Date.now().toString(36);
  const song = { id, title: 'New song', artist: '', tuning: 'std', key: 4, mode: 'minor', bpm: null, notes: '', sources: [], draft: false, created: Date.now(),
    parts: [{ id: 'p1', name: 'Intro / main riff', note: '' }, { id: 'p2', name: 'Verse', note: '' }, { id: 'p3', name: 'Chorus', note: '' }] };
  saveBandSong(song);
  return song;
}
