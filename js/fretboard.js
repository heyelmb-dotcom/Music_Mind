// A 4-string bass neck (E A D G, frets 0-12) drawn with DOM so every position is tappable.
import { h } from './ui.js';
import { SCALES, mod12, spell, degreeName } from './theory.js';
import { trigger, unlockAudio, getCtx } from './audio.js';

export const STRINGS = [['G', 7, 43], ['D', 2, 38], ['A', 9, 33], ['E', 4, 28]]; // name, pitch class, open MIDI
export const FRETS = 12;
const MARKERS = { 3: '•', 5: '•', 7: '•', 9: '•', 12: '••', 15: '•', 17: '•', 19: '•', 21: '•', 24: '••' };

export async function playMidi(midi) {
  await unlockAudio();
  trigger('pluckbass', getCtx().currentTime + 0.01, midi, 0.6, 1);
}

// opts: { key, mode, labels: 'degree'|'name', showAll, hideKey, frets, onTap(pos),
//         marks: { 'A:5': className }, markLabels: { 'A:5': text } }
export function fretboard(opts) {
  const { key, mode = 'major', labels = 'degree', showAll = false, onTap, marks = {}, markLabels = {}, hideKey = false, frets = FRETS } = opts;
  const scale = SCALES[mode] || SCALES.major;
  const cols = { gridTemplateColumns: `22px 38px repeat(${frets}, 1fr)` };
  const rows = STRINGS.map(([name, open, openMidi]) => {
    const cells = [];
    for (let f = 0; f <= frets; f++) {
      const pc = mod12(open + f);
      const semi = mod12(pc - key);
      const inKey = scale.includes(semi);
      const pos = `${name}:${f}`;
      const mark = marks[pos];
      const show = !hideKey && (inKey || showAll);
      const label = labels === 'degree' ? degreeName(semi) : spell(pc, key, mode);
      cells.push(h('button', {
        class: 'fb-cell' + (f === 0 ? ' open' : '') + (mark ? ' ' + mark : ''),
        'aria-label': `${name} string fret ${f}`,
        'data-pos': pos,
        onclick: () => { playMidi(openMidi + f); onTap && onTap({ string: name, fret: f, pc, semi, inKey }); },
      }, show || mark ? h('span', { class: 'fb-dot' + (semi === 0 && (show || markLabels[pos]) ? ' tonic' : '') + (inKey ? '' : ' outside') }, markLabels[pos] ?? (mark && !show ? '' : label)) : null));
    }
    return h('div', { class: `fb-row str-${name}`, style: cols }, h('span', { class: 'fb-name' }, name), cells);
  });
  // Pearl dot inlays, set into the wood behind the strings, like a real neck.
  const inlays = [h('span', {}), h('span', {})];
  for (let f = 1; f <= frets; f++) inlays.push(h('span', { class: 'fb-inlay' + (MARKERS[f] === '••' ? ' double' : MARKERS[f] ? ' single' : '') }));
  const nums = [h('span', { class: 'fb-name' }, '')];
  for (let f = 0; f <= frets; f++) nums.push(h('span', { class: 'fb-num' }, f === 0 ? '0' : MARKERS[f] ? `${f}` : ''));
  return h('div', { class: 'fb-scroll' }, h('div', { class: 'fb', style: { minWidth: `${Math.max(620, 60 + frets * 46)}px` } },
    h('div', { class: 'fb-board' }, h('div', { class: 'fb-row fb-inlays', style: cols }, inlays), rows),
    h('div', { class: 'fb-row nums', style: cols }, nums)));
}
