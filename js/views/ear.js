// Ear drills: free practice and concept trials.
import { h, mount, toast } from '../ui.js';
import { DRILLS, PROGRESSIONS, BANDS } from '../drills.js';
import { INTERVALS, QUALITIES } from '../theory.js';
import { conceptById } from '../data/concepts.js';
import { markPassed, isPassed } from '../store.js';
import { allSongs, isUnlocked } from '../library.js';
import { unlockAudio, stopBus } from '../audio.js';

// Every option a drill can include, for building custom practice sets.
const ALL_OPTIONS = {
  intervals: INTERVALS.filter((i) => i.semi > 0).map((i) => [i.short, i.name]),
  quality: Object.entries(QUALITIES).map(([k, v]) => [k, v.label]),
  progression: Object.entries(PROGRESSIONS).map(([k, v]) => [k, v.label]),
  eq: BANDS.map((b) => [b.id, b.label]),
  dropout: [['kick', 'Kick'], ['snare', 'Snare/Clap'], ['hat', 'Hats'], ['bass', 'Bass'], ['chords', 'Chords'], ['lead', 'Lead']],
};

export function renderList(el) {
  mount(el,
    h('section', { class: 'page' },
      h('header', { class: 'hero' }, h('h1', {}, 'Ear'),
        h('p', {}, 'Free practice: no gates and no tallies. Trials live on the Path.')),
      ['musical', 'production'].map((side) => h('div', {},
        h('h2', { class: 'section-title' }, side === 'musical' ? 'Musical ears' : 'Production ears'),
        h('div', { class: 'cards' }, Object.entries(DRILLS).filter(([, d]) => d.side === side).map(([id, d]) =>
          h('a', { class: 'card', href: `#/drill/${id}` }, h('h3', {}, d.title), h('p', {}, d.about))))))));
}

export function renderDrill(el, id, params) {
  const drill = DRILLS[id];
  if (!drill) return mount(el, h('p', {}, 'Unknown drill'));
  const trialConcept = params.get('trial') ? conceptById(params.get('trial')) : null;
  const trial = trialConcept?.trial;
  let set = trial ? trial.opts.set : (params.get('set') ? params.get('set').split(',') : drill.defaults.set);
  let q = null, answered = null, asked = 0, right = 0, finished = false;

  const next = () => {
    q = drill.make({ set });
    answered = null;
    asked++;
    draw();
    unlockAudio().then(() => q.play());
  };

  const answer = (optId) => {
    if (answered) return;
    answered = optId;
    if (optId === q.answer) right++;
    draw();
  };

  function setPicker() {
    if (trial) return null;
    return h('details', { class: 'set-picker' }, h('summary', {}, 'Choose what to practise'),
      h('div', { class: 'row wrap' }, ALL_OPTIONS[id].map(([v, label]) => h('button', {
        class: 'chip' + (set.includes(v) ? ' on' : ''),
        onclick: () => {
          const nextSet = set.includes(v) ? set.filter((x) => x !== v) : [...set, v];
          if (nextSet.length < 2) return toast('Keep at least two options');
          set = ALL_OPTIONS[id].map(([k]) => k).filter((k) => nextSet.includes(k));
          asked = 0; q = null; draw();
        },
      }, label))));
  }

  function result() {
    const passed = right >= trial.need;
    let newly = [];
    if (passed && !isPassed(trialConcept.id)) {
      const before = new Set(allSongs().filter(isUnlocked).map((s) => s.id));
      markPassed(trialConcept.id);
      newly = allSongs().filter((s) => isUnlocked(s) && !before.has(s.id));
    }
    return h('div', { class: 'result ' + (passed ? 'pass' : 'fail') },
      h('h2', {}, passed ? `Earned: ${trialConcept.title}` : 'Not yet'),
      h('p', {}, `${right} of ${trial.of} — you needed ${trial.need}.`),
      newly.length ? h('p', {}, 'Unlocked: ', newly.map((s) => h('a', { class: 'btn primary', href: `#/song/${s.id}` }, s.title))) : null,
      h('div', { class: 'actions' },
        h('button', { class: 'btn', onclick: () => { asked = 0; right = 0; finished = false; next(); } }, passed ? 'Run it again' : 'Try again'),
        h('a', { class: 'btn', href: `#/drill/${id}?set=${set.join(',')}` }, 'Practise freely'),
        h('a', { class: 'btn', href: '#/path' }, 'Back to Path')));
  }

  function draw() {
    const head = h('header', { class: 'hero' },
      h('a', { class: 'back', href: trial ? '#/path' : '#/ear' }, '← ' + (trial ? 'Path' : 'Ear')),
      h('h1', {}, trial ? `Trial: ${trialConcept.title}` : drill.title),
      h('p', {}, drill.about),
      trial && h('p', { class: 'progress' }, `Question ${Math.min(asked, trial.of)} of ${trial.of} · need ${trial.need}`));
    if (finished) return mount(el, h('section', { class: 'page' }, head, result()));
    if (!q) return mount(el, h('section', { class: 'page' }, head, setPicker(),
      h('div', { class: 'drill-start' }, h('button', { class: 'btn primary big', onclick: next }, trial ? 'Start trial' : 'Start'))));
    mount(el, h('section', { class: 'page' }, head, setPicker(),
      h('div', { class: 'drill' },
        h('div', { class: 'row' },
          h('button', { class: 'btn big', onclick: () => q.play() }, '▶ Replay'),
          q.reference && h('button', { class: 'btn', onclick: () => q.reference() }, id === 'eq' ? 'Flat reference' : 'Full loop')),
        h('div', { class: 'options' }, q.options.map((o) => {
          let cls = 'opt';
          if (answered) {
            if (o.id === q.answer) cls += ' correct';
            else if (o.id === answered) cls += ' wrong';
          }
          return h('div', { class: 'opt-row' },
            h('button', { class: cls, onclick: () => answer(o.id) }, o.label),
            answered && h('button', { class: 'btn ghost small', title: 'Hear this one', onclick: () => q.playOption(o.id) }, '▶'));
        })),
        answered && h('div', { class: 'feedback' },
          h('p', {}, answered === q.answer ? 'Yes.' : `It was ${q.options.find((o) => o.id === q.answer).label}. Tap ▶ next to each option to compare.`),
          h('button', { class: 'btn primary', onclick: () => { if (trial && asked >= trial.of) { finished = true; draw(); } else next(); } }, 'Next')))));
  }
  draw();
  return () => stopBus();
}
