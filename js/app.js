// App shell: hash router + bottom navigation.
import { h, mount, sheet, toast, download, pickFile } from './ui.js';
import * as studio from './views/studio.js';
import * as path from './views/path.js';
import * as ear from './views/ear.js';
import * as songs from './views/songs.js';
import { exportAll, importAll, resetProgress } from './store.js';
import { stopBus } from './audio.js';

const view = document.getElementById('view');
const nav = document.getElementById('nav');

const TABS = [
  ['path', 'Path', '◇'],
  ['studio', 'Studio', '▦'],
  ['ear', 'Ear', '◉'],
  ['songs', 'Songs', '♫'],
];

let cleanup = null;

function route() {
  if (cleanup) { cleanup(); cleanup = null; }
  stopBus();
  const [pathPart, query] = (location.hash.slice(2) || 'path').split('?');
  const [name, arg] = pathPart.split('/');
  const params = new URLSearchParams(query || '');
  if (name !== 'studio') studio.unmount();
  if (name === 'drill' && studio.player.playing) studio.player.stop();
  const active = { drill: 'ear', song: 'songs', edit: 'songs' }[name] || name;
  mount(nav, TABS.map(([id, label, icon]) => h('a', { href: `#/${id}`, class: id === active ? 'on' : '' }, h('span', { class: 'ico' }, icon), label)),
    h('button', { class: 'nav-more', onclick: settings, 'aria-label': 'Settings' }, h('span', { class: 'ico' }, '⚙'), 'More'));
  switch (name) {
    case 'studio': studio.render(view); break;
    case 'ear': ear.renderList(view); break;
    case 'drill': cleanup = ear.renderDrill(view, arg, params); break;
    case 'songs': songs.renderList(view); break;
    case 'song': songs.renderSong(view, arg); break;
    case 'edit': songs.renderEditor(view, arg); break;
    default: path.render(view);
  }
  if (name !== 'studio') window.scrollTo(0, 0);
}

function settings() {
  sheet('Music Mind', h('div', { class: 'menu' },
    h('p', {}, 'Everything (progress, song maps, journal, projects) is saved on this device only. Back it up now and then.'),
    h('div', { class: 'row wrap' },
      h('button', { class: 'btn', onclick: () => download(`music-mind-backup-${new Date().toISOString().slice(0, 10)}.json`, exportAll(), 'application/json') }, 'Back up everything'),
      h('button', { class: 'btn', onclick: async () => {
        const txt = await pickFile('.json,application/json');
        if (!txt) return;
        try { importAll(txt); toast('Restored'); route(); } catch (_) { toast('Not a Music Mind backup'); }
      } }, 'Restore backup'),
      h('button', { class: 'btn ghost', onclick: () => { if (confirm('Reset all earned concepts? Songs will lock again. Maps, journal and projects are kept.')) { resetProgress(); toast('Progress reset'); route(); } } }, 'Reset progress')),
    h('h4', {}, 'Put it on your phone'),
    h('p', {}, 'iPhone: open this page in Safari → Share → Add to Home Screen. Android: Chrome menu → Install app. It then runs full-screen and works offline.'),
    h('p', { class: 'hint' }, 'If you hear nothing on iPhone, check the volume. The app asks iOS to ignore the silent switch, but older iOS versions still obey it.')));
}

window.addEventListener('hashchange', route);
route();

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
