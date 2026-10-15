// App shell: hash router + bottom navigation.
import { h, mount, ask, sheet, toast, download, pickFile } from './ui.js';
import * as studio from './views/studio.js';
import * as path from './views/path.js';
import * as ear from './views/ear.js';
import * as songs from './views/songs.js';
import * as bass from './views/bass.js';
import * as keyView from './views/key.js';
import { exportAll, importAll, resetProgress, setting, setSetting } from './store.js';
import { stopBus } from './audio.js';
import { initDotField, revealDots } from './dotfield.js';

const view = document.getElementById('view');
const nav = document.getElementById('nav');

const TABS = [
  ['key', 'Key', '◇'],
  ['bass', 'Bass', '♩'],
  ['studio', 'Studio', '▦'],
  ['ear', 'Ear', '◉'],
  ['songs', 'Songs', '♫'],
];

let cleanup = null;
let enterTimer = 0;

function route() {
  if (cleanup) { cleanup(); cleanup = null; }
  stopBus();
  document.querySelectorAll('.sheet-wrap').forEach((e) => e.remove()); // menus never outlive their page
  const [pathPart, query] = (location.hash.slice(2) || 'key').split('?');
  const [name, arg, arg2] = pathPart.split('/');
  const params = new URLSearchParams(query || '');
  if (name !== 'studio') studio.unmount();
  if (name === 'drill' && studio.player.playing) studio.player.stop();
  if (!(name === 'bass' && arg)) bass.stop();
  const active = { drill: 'ear', song: 'songs', edit: 'songs', path: 'key' }[name] || name;
  mount(nav, TABS.map(([id, label, icon]) => h('a', { href: `#/${id}`, class: id === active ? 'on' : '' }, h('span', { class: 'ico' }, icon), label)),
    h('button', { class: 'nav-more', onclick: settings, 'aria-label': 'Settings' }, h('span', { class: 'ico' }, '⚙'), 'More'));
  switch (name) {
    case 'studio': studio.render(view); break;
    case 'key': cleanup = keyView.render(view, arg, params) || null; break;
    case 'path': path.render(view); break;
    case 'bass': arg === 'p' ? bass.renderProject(view, arg2) : arg === 's' ? bass.renderBandSong(view, arg2, params) : arg ? bass.renderLesson(view, arg) : bass.renderList(view); break;
    case 'ear': ear.renderList(view); break;
    case 'drill': cleanup = ear.renderDrill(view, arg, params); break;
    case 'songs': songs.renderList(view); break;
    case 'song': songs.renderSong(view, arg); break;
    case 'edit': songs.renderEditor(view, arg); break;
    default: keyView.render(view, null, params);
  }
  if (name !== 'studio') window.scrollTo(0, 0);
  // page entrance: content fades up, the dot frame spreads in from the edges
  view.classList.remove('enter');
  void view.offsetWidth;
  view.classList.add('enter');
  clearTimeout(enterTimer);
  enterTimer = setTimeout(() => view.classList.remove('enter'), 500); // so in-page redraws don't replay it
  revealDots();
}

function settings() {
  const seg = (k, options) => h('div', { class: 'seg' }, options.map(([v, label]) => h('button', {
    class: 'seg-btn' + (setting(k) === v ? ' on' : ''),
    onclick: (e) => { setSetting(k, v); e.target.parentNode.querySelectorAll('.seg-btn').forEach((b) => b.classList.toggle('on', b === e.target)); },
  }, label)));
  sheet('Music Mind', h('div', { class: 'menu' },
    h('h4', {}, 'Bass playback'),
    seg('bassPlay', [['up', 'Up an octave'], ['real', 'Real pitch'], ['both', 'Both']]),
    h('p', { class: 'hint' }, 'Notes are always written and shown where you play them. Up an octave is easiest to hear on a phone speaker; Real pitch is the true register, for headphones or an amp; Both blends the two.'),
    h('h4', {}, 'Your neck'),
    seg('frets', [[20, '20 frets'], [22, '22 frets']]),
    h('h4', {}, 'Your data'),
    h('p', {}, 'Everything (progress, song maps, journal, projects) is saved on this device only. Back it up now and then.'),
    h('div', { class: 'row wrap' },
      h('button', { class: 'btn', onclick: () => download(`music-mind-backup-${new Date().toISOString().slice(0, 10)}.json`, exportAll(), 'application/json') }, 'Back up everything'),
      h('button', { class: 'btn', onclick: async () => {
        const txt = await pickFile('.json,application/json');
        if (!txt) return;
        try { importAll(txt); toast('Restored'); route(); } catch (_) { toast('Not a Music Mind backup'); }
      } }, 'Restore backup'),
      h('button', { class: 'btn ghost', onclick: async () => { if (await ask('Reset all earned concepts? Songs will lock again. Maps, journal and projects are kept.')) { resetProgress(); toast('Progress reset'); route(); } } }, 'Reset progress')),
    h('div', { class: 'row' }, h('a', { class: 'btn', href: '#/path' }, 'The Path (concepts & unlocks)')),
    h('h4', {}, 'Put it on your phone'),
    h('p', {}, 'iPhone: open this page in Safari → Share → Add to Home Screen. Android: Chrome menu → Install app. It then runs full-screen and works offline.'),
    h('p', { class: 'hint' }, 'If you hear nothing on iPhone, check the volume. The app asks iOS to ignore the silent switch, but older iOS versions still obey it.')));
}

window.addEventListener('hashchange', route);
initDotField();
route();

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
