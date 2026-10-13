// Local persistence. Everything lives on this device; export/import for backups.
const KEY = 'musicmind.v1';

const defaults = () => ({
  concepts: {}, // id -> { passed: true, at: ISO date }
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
