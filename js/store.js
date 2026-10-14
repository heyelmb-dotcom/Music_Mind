// Local persistence. Everything lives on this device; export/import for backups.
const KEY = 'musicmind.v1';

const defaults = () => ({
  concepts: {}, // id -> { passed: true, at: ISO date }
  keys: {}, // '10-major' (pitch class-mode) -> ISO date the neck quiz was passed
  labels: 'chord', // how notes are labelled: 'chord' (R 3 5) or 'key' (1-7)
  journal: {}, // songId -> { missionIndex: text }
  songEdits: {}, // songId -> full song map overriding the built-in draft
  customSongs: [], // songs you mapped from scratch
  project: null, // current Studio project
  saved: {}, // name -> project
});

let state = null;

export function load() {
  if (state) return state;
  try {
    const raw = localStorage.getItem(KEY);
    state = raw ? { ...defaults(), ...JSON.parse(raw) } : defaults();
  } catch (_) {
    state = defaults();
  }
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
  state = { ...defaults(), ...data };
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
