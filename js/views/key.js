// The Key: hear where home is, then know the whole key on the neck.
import { h, mount, toast, select } from '../ui.js';
import { fretboard, playMidi, STANDARD, FRETS } from '../fretboard.js';
import { SCALES, SCALE_LABELS, spell, degreeName, diatonicChords, chordSymbol, mod12 } from '../theory.js';
import { playProgression } from '../drills.js';
import { stopBus } from '../audio.js';
import { isKeyMastered, markKey, load } from '../store.js';

const rand = (n) => Math.floor(Math.random() * n);
const pick = (a) => a[rand(a.length)];
const keyName = (pc, mode) => `${spell(pc, pc, mode)} ${mode}`;

const MAJOR_PROGS = [['I', 'V', 'vi', 'IV'], ['I', 'vi', 'IV', 'V'], ['I', 'IV', 'V', 'IV'], ['I', 'bVII', 'IV', 'I'], ['I', 'iii', 'IV', 'V']];
const MINOR_PROGS = [['i', 'bVI', 'bIII', 'bVII'], ['i', 'bVII', 'bVI', 'V'], ['i', 'iv', 'v', 'i'], ['i', 'iv', 'bVII', 'bIII']];

function tabs(active) {
  return h('div', { class: 'seg' },
    [['', 'Overview'], ['find', 'Find home'], ['neck', 'The neck'], ['prove', 'Prove it']].map(([id, label]) =>
      h('a', { class: 'seg-btn' + (active === id ? ' on' : ''), href: '#/key' + (id ? '/' + id : '') }, label)));
}

function masteryGrid() {
  const row = (mode) => h('div', { class: 'kg-row' },
    h('span', { class: 'kg-label' }, mode),
    [...Array(12).keys()].map((pc) => {
      const done = isKeyMastered(pc, mode);
      return h('a', { class: 'kg-cell' + (done ? ' done' : ''), href: `#/key/neck?k=${pc}&m=${mode}`, title: keyName(pc, mode) + (done ? ' (mastered)' : '') }, spell(pc, pc, mode));
    }));
  return h('div', { class: 'kg' }, row('major'), row('minor'));
}

// ---------- Overview ----------
function overview(el) {
  const n = Object.keys(load().keys).length;
  mount(el, h('section', { class: 'page' },
    h('div', { class: 'masthead' }, h('div', { class: 'mm-title' }, 'Music Mind'), h('div', { class: 'mm-sub' }, 'hear the key, know the neck')),
    h('header', { class: 'hero' }, h('h1', {}, 'Hear the key. Know it on the neck.'),
      h('p', {}, 'Every song has a home note. Find it by ear, and the whole song becomes one pattern of numbers on the fretboard: 1 is home, 5 is strong, 4 and 5 are the big moves, 3 decides major or minor. Notes outside the pattern are the spice, and now you can see them.')),
    tabs(''),
    h('div', { class: 'steps3' },
      h('a', { class: 'step3', href: '#/key/find' }, h('b', {}, '1 · Find home'), h('span', {}, 'A progression plays in a random key. Tap home on the neck, then say whether it is major or minor.')),
      h('a', { class: 'step3', href: '#/key/neck' }, h('b', {}, '2 · The neck'), h('span', {}, 'Any key, every position, labelled 1–7. The shape is the same in every key: it just slides.')),
      h('a', { class: 'step3', href: '#/key/prove' }, h('b', {}, '3 · Prove it'), h('span', {}, 'A 12-question neck quiz in one key. Pass it and the key fills in below.'))),
    h('h2', { class: 'section-title' }, `Keys mastered: ${n} of 24`),
    masteryGrid(),
    h('p', { class: 'hint' }, 'Tap a key to open it on the neck. A key fills in when you pass its quiz with 11 of 12 right.'),
    h('a', { class: 'callout', href: '#/path' }, h('b', {}, 'The Path'), h('span', {}, 'Concepts that unlock songs: rhythm, harmony and production ideas, each with a trial.'))));
}

// ---------- Find home ----------
function findHome(el) {
  let q, wrong, stage, marks;
  const next = () => {
    const mode = Math.random() < 0.5 ? 'major' : 'minor';
    const prog = pick(mode === 'major' ? MAJOR_PROGS : MINOR_PROGS);
    q = { key: rand(12), mode, prog: [...prog, prog[0]] };
    wrong = 0; stage = 'home'; marks = {};
    draw();
    play();
  };
  const play = () => playProgression(q.prog, q.key, 0.95);
  const onTap = (pos) => {
    if (stage !== 'home') return;
    if (pos.pc === q.key) {
      marks[`${pos.idx}:${pos.fret}`] = 'right';
      stage = 'mode';
    } else {
      marks[`${pos.idx}:${pos.fret}`] = 'wrong';
      wrong++;
      if (wrong >= 3) stage = 'mode';
    }
    draw();
  };
  const answerMode = (m) => {
    stage = 'done';
    q.modeRight = m === q.mode;
    draw();
  };
  function draw() {
    const body = [];
    if (!q) body.push(h('div', { class: 'drill-start' }, h('button', { class: 'btn primary big', onclick: next }, 'Start')));
    else {
      body.push(h('div', { class: 'row' }, h('button', { class: 'btn big', onclick: play }, '▶ Replay'),
        h('span', { class: 'muted' }, stage === 'home' ? 'Tap home on the neck. Hum the note the progression wants to land on.' : '')));
      body.push(fretboard({ key: q.key, mode: q.mode, hideKey: stage !== 'done', marks, onTap, labels: 'degree' }));
      if (stage === 'mode') body.push(h('div', { class: 'feedback' },
        h('p', {}, wrong >= 3 && !Object.values(marks).includes('right') ? `Home was ${spell(q.key, q.key, q.mode)}.` : `Yes, home is ${spell(q.key, q.key, q.mode)}. Major or minor?`),
        h('div', { class: 'row' }, h('button', { class: 'btn', onclick: () => answerMode('major') }, 'Major (bright)'), h('button', { class: 'btn', onclick: () => answerMode('minor') }, 'Minor (dark)'))));
      if (stage === 'done') body.push(h('div', { class: 'feedback' },
        h('p', {}, q.modeRight ? 'Right: ' : 'It was ', h('b', {}, keyName(q.key, q.mode)), `. The progression was ${q.prog.slice(0, 4).join(' – ')}. The dots show the whole key.`),
        h('div', { class: 'row' },
          h('a', { class: 'btn', href: `#/key/neck?k=${q.key}&m=${q.mode}` }, 'Open this key'),
          h('button', { class: 'btn primary', onclick: next }, 'Next'))));
    }
    mount(el, h('section', { class: 'page' },
      h('header', { class: 'hero' }, h('h1', {}, 'Find home'), h('p', {}, 'Four chords and a return home, in a random key. Where does it want to rest?')),
      tabs('find'), body));
  }
  draw();
  return () => stopBus();
}

// ---------- The neck ----------
function neck(el, params) {
  let key = params.get('k') !== null ? +params.get('k') : 10;
  let mode = params.get('m') || 'major';
  let labels = 'degree';
  let showAll = false;
  const playScale = () => {
    const low = 28 + mod12(key - 4); // lowest tonic from E string
    const sc = SCALES[mode];
    [...sc, 12].forEach((s, i) => setTimeout(() => playMidi(low + s), i * 260));
  };
  function draw() {
    mount(el, h('section', { class: 'page' },
      h('header', { class: 'hero' }, h('h1', {}, `${keyName(key, mode)} on the neck`),
        h('p', {}, 'Every dot is in the key. 1 is home. Find the 1s first, then the 5s next to them: that is the box every bassline starts from.')),
      tabs('neck'),
      h('div', { class: 'row' },
        h('label', { class: 'field' }, h('span', {}, 'Home'), select(key, [...Array(12).keys()].map((pc) => [pc, spell(pc, pc, mode)]), (v) => { key = +v; draw(); })),
        h('label', { class: 'field' }, h('span', {}, 'Scale'), select(mode, Object.entries(SCALE_LABELS), (v) => { mode = v; draw(); })),
        h('label', { class: 'field' }, h('span', {}, 'Labels'), select(labels, [['degree', 'Numbers 1–7'], ['name', 'Note names']], (v) => { labels = v; draw(); })),
        h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: showAll, onchange: (e) => { showAll = e.target.checked; draw(); } }), ' Outside notes')),
      fretboard({ key, mode, labels, showAll }),
      h('div', { class: 'actions' },
        h('button', { class: 'btn', onclick: playScale }, '▶ Play the scale'),
        (mode === 'major' || mode === 'minor') && h('a', { class: 'btn primary', href: `#/key/prove?k=${key}&m=${mode}` }, isKeyMastered(key, mode) ? 'Prove it again' : `Prove ${keyName(key, mode)}`)),
      h('h2', { class: 'section-title' }, 'The chords that live in this key'),
      h('div', { class: 'pick-grid' }, diatonicChords(mode).map((r) => h('button', { class: 'chip', onclick: () => playProgression([r], key, 1.2) },
        h('b', {}, r), h('small', {}, chordSymbol(r, key, mode))))),
      h('p', { class: 'hint' }, 'Each chord is built on one of the numbers. As a bassist, when the band plays the IV chord you are usually on the 4.')));
  }
  draw();
  return () => stopBus();
}

// ---------- Prove it ----------
function prove(el, params) {
  let key = params.get('k') !== null ? +params.get('k') : null;
  let mode = params.get('m') || 'major';
  const N = 12, NEED = 11;
  let qn = 0, right = 0, q = null, answered = null, marks = {};

  const scaleSemis = () => SCALES[mode];
  const newQ = () => {
    answered = null; marks = {};
    if (Math.random() < 0.5) {
      const semi = pick(scaleSemis());
      q = { type: 'find', semi };
    } else {
      const idx = rand(STANDARD.length);
      const open = STANDARD[idx][1];
      let f, semi;
      do { f = rand(FRETS + 1); semi = mod12(open + f - key); } while (!scaleSemis().includes(semi));
      q = { type: 'name', pos: `${idx}:${f}`, semi };
      marks[q.pos] = 'ask';
    }
    qn++;
    draw();
  };
  const onTap = (pos) => {
    if (!q || q.type !== 'find' || answered) return;
    const ok = pos.semi === q.semi;
    q.tapped = pos.semi;
    marks[`${pos.idx}:${pos.fret}`] = ok ? 'right' : 'wrong';
    answered = ok ? 'right' : 'wrong';
    if (ok) right++;
    draw();
  };
  const nameAnswer = (semi) => {
    if (answered) return;
    const ok = semi === q.semi;
    q.tapped = semi;
    marks[q.pos] = ok ? 'right' : 'wrong';
    answered = ok ? 'right' : 'wrong';
    if (ok) right++;
    draw();
  };

  function draw() {
    const head = h('header', { class: 'hero' }, h('h1', {}, key === null ? 'Prove it' : `Prove ${keyName(key, mode)}`),
      h('p', {}, `Twelve questions on the neck, no dots. Get ${NEED} right and the key is yours.`));
    if (key === null) {
      return mount(el, h('section', { class: 'page' }, head, tabs('prove'),
        h('p', {}, 'Pick a key. Start with the keys your band plays in.'), masteryGrid().cloneNode(true),
        h('div', { class: 'kg-pick' }, ['major', 'minor'].map((m) => h('div', { class: 'row wrap' }, h('span', { class: 'kg-label' }, m),
          [...Array(12).keys()].map((pc) => h('a', { class: 'chip', href: `#/key/prove?k=${pc}&m=${m}` }, spell(pc, pc, m))))))));
    }
    const body = [];
    if (!q) body.push(h('div', { class: 'drill-start' }, h('button', { class: 'btn primary big', onclick: newQ }, 'Start')));
    else {
      body.push(h('p', { class: 'progress' }, `Question ${qn} of ${N} · need ${NEED}`));
      body.push(h('p', { class: 'ask' }, q.type === 'find' ? `Tap a ${degreeName(q.semi)} (home is ${spell(key, key, mode)})` : 'What number is the highlighted note?'));
      body.push(fretboard({ key, mode, hideKey: !answered, marks, onTap, labels: 'degree' }));
      if (q.type === 'name') body.push(h('div', { class: 'row wrap' }, scaleSemis().map((s) => h('button', { class: 'chip' + (answered && s === q.semi ? ' on' : ''), onclick: () => nameAnswer(s) }, degreeName(s)))));
      if (answered) {
        const last = qn >= N;
        body.push(h('div', { class: 'feedback' },
          h('p', {}, answered === 'right' ? 'Yes.' : q.type === 'find' ? `No, you tapped a ${degreeName(q.tapped)}. The dots now show the whole key.` : `No, it's a ${degreeName(q.semi)}. The dots now show the whole key.`),
          h('button', { class: 'btn primary', onclick: () => { if (last) finish(); else newQ(); } }, last ? 'See result' : 'Next')));
      }
    }
    mount(el, h('section', { class: 'page' }, head, tabs('prove'), body));
  }
  function finish() {
    const passed = right >= NEED;
    if (passed) markKey(key, mode);
    mount(el, h('section', { class: 'page' },
      h('header', { class: 'hero' }, h('h1', {}, passed ? `${keyName(key, mode)}: mastered` : 'Not yet')),
      tabs('prove'),
      h('div', { class: 'result ' + (passed ? 'pass' : 'fail') }, h('p', {}, `${right} of ${N}. You needed ${NEED}.`),
        h('div', { class: 'actions' },
          h('button', { class: 'btn', onclick: () => { qn = 0; right = 0; q = null; draw(); } }, 'Again'),
          h('a', { class: 'btn', href: `#/key/neck?k=${key}&m=${mode}` }, 'Study the neck'),
          h('a', { class: 'btn primary', href: '#/key' }, 'Mastery grid')))));
    if (passed) toast(`${keyName(key, mode)} added to your keys`);
  }
  draw();
}

export function render(el, sub, params) {
  if (sub === 'find') return findHome(el);
  if (sub === 'neck') return neck(el, params);
  if (sub === 'prove') return prove(el, params);
  overview(el);
}
