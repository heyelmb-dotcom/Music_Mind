// Song library: built-in drafts merged with your edits, plus songs you mapped yourself.
import { SONGS } from './data/songs.js';
import { load, update, isPassed } from './store.js';
import { clone } from './project.js';

export function allSongs() {
  const st = load();
  const built = SONGS.map((s) => (st.songEdits[s.id] ? { ...clone(s), ...st.songEdits[s.id], id: s.id, requires: s.requires } : clone(s)));
  return [...built, ...st.customSongs.map(clone)];
}

export const songById = (id) => allSongs().find((s) => s.id === id);

export const missingFor = (song) => (song.requires || []).filter((c) => !isPassed(c));
export const isUnlocked = (song) => missingFor(song).length === 0;

export function saveSong(song) {
  update((st) => {
    if (song.custom) {
      const i = st.customSongs.findIndex((s) => s.id === song.id);
      if (i >= 0) st.customSongs[i] = clone(song);
      else st.customSongs.push(clone(song));
    } else {
      st.songEdits[song.id] = clone(song);
    }
  });
}

export function deleteSong(song) {
  update((st) => {
    if (song.custom) st.customSongs = st.customSongs.filter((s) => s.id !== song.id);
    else delete st.songEdits[song.id];
  });
}
