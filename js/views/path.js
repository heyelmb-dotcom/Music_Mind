// The Path: concepts to learn. Earning a concept's trial unlocks songs.
import { h, mount, toast } from '../ui.js';
import { CONCEPTS } from '../data/concepts.js';
import { DEMOS } from '../data/demos.js';
import { DRILLS } from '../drills.js';
import { isPassed, markPassed, load } from '../store.js';
import { allSongs, missingFor } from '../library.js';
import { fromSketch } from '../project.js';
import { loadProject, getProject } from './studio.js';

const open = new Set();

function unlocksFor(cid) {
  return allSongs().filter((s) => (s.requires || []).includes(cid));
}

function card(c, rerender) {
  const passed = isPassed(c.id);
  const expanded = open.has(c.id);
  const songs = unlocksFor(c.id);
  const t = c.trial;
  const actions = [];
  if (c.demo) actions.push(h('button', { class: 'btn', onclick: () => { loadProject(fromSketch(DEMOS[c.demo]), 'demo:' + c.demo); location.hash = '#/studio'; } }, 'Hear the demo'));
  if (t.type === 'ear') {
    actions.push(h('a', { class: 'btn', href: `#/drill/${t.drill}?set=${t.opts.set.join(',')}` }, 'Practise'));
    actions.push(h('a', { class: 'btn primary', href: `#/drill/${t.drill}?trial=${c.id}` }, passed ? 'Retake trial' : `Take the trial (${t.need}/${t.of})`));
  } else {
    actions.push(h('a', { class: 'btn', href: '#/studio' }, 'Open Studio'));
    actions.push(h('button', { class: 'btn primary', onclick: () => {
      const p = getProject();
      if (p.origin) return toast('That\'s an untouched demo/sketch. Build or change it yourself first.', 3500);
      const r = t.check(p);
      if (r.ok) {
        const before = allSongs().filter((s) => missingFor(s).length === 0).length;
        markPassed(c.id);
        const after = allSongs().filter((s) => missingFor(s).length === 0).length;
        toast(after > before ? `Earned: ${c.title}. New song unlocked.` : `Earned: ${c.title}.`, 3500);
        rerender();
      } else toast(r.msg, 4000);
    } }, passed ? 'Check again' : 'Check my Studio pattern'));
  }
  return h('article', { class: 'concept' + (passed ? ' passed' : '') + (expanded ? ' open' : '') },
    h('button', { class: 'concept-head', onclick: () => { expanded ? open.delete(c.id) : open.add(c.id); rerender(); } },
      h('span', { class: 'badge side-' + c.side }, c.side),
      h('span', { class: 'concept-title' }, c.title),
      h('span', { class: 'status' }, passed ? '✓ earned' : t.type === 'ear' ? 'ear trial' : 'build trial')),
    expanded && h('div', { class: 'concept-body' },
      c.idea.map((p) => h('p', {}, p)),
      h('p', { class: 'listen' }, h('b', {}, 'Listen for: '), c.listen),
      t.type === 'build' ? h('p', { class: 'task' }, h('b', {}, 'Trial: '), t.task)
        : h('p', { class: 'task' }, h('b', {}, 'Trial: '), `${DRILLS[t.drill].title}: get ${t.need} of ${t.of} right.`),
      songs.length ? h('p', { class: 'unlocks' }, 'Unlocks (with others): ', songs.map((s) => h('a', { href: `#/song/${s.id}` }, s.title)).reduce((a, x) => (a.length ? [...a, ', ', x] : [x]), [])) : null,
      h('div', { class: 'actions' }, actions)));
}

export function render(el) {
  const rerender = () => render(el);
  const earned = CONCEPTS.filter((c) => isPassed(c.id)).length;
  const firstVisit = !Object.keys(load().concepts).length;
  mount(el,
    h('section', { class: 'page' },
      h('header', { class: 'hero' },
        h('h1', {}, 'The Path'),
        h('p', {}, firstVisit
          ? 'Every song is made of the same few layers: rhythm, bass, harmony, melody, texture and arrangement. Each concept here is one way of hearing those layers. Earn a concept by passing its trial; earn the right concepts and a song opens up for you to take apart.'
          : `${earned} of ${CONCEPTS.length} concepts earned.`)),
      h('a', { class: 'callout', href: '#/bass' }, h('b', {}, 'Start with the Bass Lab'), h('span', {}, 'Seven short lessons on how the bass relates to the kick, the chords and the space. Flip between bass parts while the loop plays.')),
      h('div', { class: 'concepts' }, CONCEPTS.map((c) => card(c, rerender)))));
}
