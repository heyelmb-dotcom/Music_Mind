// Standard MIDI File export so any sketch can be dragged into Logic.
import { chordMidi } from './theory.js';
import { BASE_MIDI, gateSteps, hasHit, isMelodic, chordAt, bassMidi } from './project.js';

const PPQ = 480;
const GM_DRUMS = { kick: 36, '808': 35, snare: 38, clap: 39, rim: 37, hat: 42, openhat: 46, shaker: 70, tom: 45 };

function vlq(n) {
  const bytes = [n & 0x7f];
  while ((n >>= 7)) bytes.unshift((n & 0x7f) | 0x80);
  return bytes;
}

const str = (s) => [...s].map((c) => c.charCodeAt(0) & 0x7f);
const u32 = (n) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];

function chunk(type, data) {
  return [...str(type), ...u32(data.length), ...data];
}

function trackChunk(events) {
  // events: {tick, order, bytes}; note-offs (order 0) before note-ons (order 1) on ties
  events.sort((a, b) => a.tick - b.tick || a.order - b.order);
  const data = [];
  let last = 0;
  for (const e of events) {
    data.push(...vlq(e.tick - last), ...e.bytes);
    last = e.tick;
  }
  data.push(0, 0xff, 0x2f, 0);
  return chunk('MTrk', data);
}

const nameEvent = (name) => ({ tick: 0, order: -1, bytes: [0xff, 0x03, ...vlq(name.length), ...str(name)] });

export function projectToMidi(p, loops = 1) {
  const tps = (PPQ * 4) / p.spb; // ticks per step
  const total = p.bars * p.spb;
  const swingTicks = (s) => (p.spb === 16 && s % 2 === 1 ? Math.round(p.swing * tps) : 0);
  const usecPerBeat = Math.round(60000000 / p.bpm);
  const conductor = [
    nameEvent(p.name || 'Music Mind'),
    { tick: 0, order: 0, bytes: [0xff, 0x51, 3, (usecPerBeat >> 16) & 255, (usecPerBeat >> 8) & 255, usecPerBeat & 255] },
    { tick: 0, order: 0, bytes: p.spb === 12 ? [0xff, 0x58, 4, 12, 3, 36, 8] : [0xff, 0x58, 4, 4, 2, 24, 8] },
  ];
  const chunks = [trackChunk(conductor)];
  let melodicCh = 0;
  for (const tr of p.tracks) {
    if (!tr.steps.some((v) => hasHit(tr, v))) continue;
    const ch = tr.kind === 'drum' ? 9 : melodicCh++;
    const ev = [nameEvent(tr.name)];
    const note = (tick, len, n, vel) => {
      ev.push({ tick, order: 1, bytes: [0x90 | ch, n, vel] });
      ev.push({ tick: tick + Math.max(1, len), order: 0, bytes: [0x80 | ch, n, 0] });
    };
    for (let l = 0; l < loops; l++) {
      for (let s = 0; s < total; s++) {
        const v = tr.steps[s];
        if (!hasHit(tr, v)) continue;
        const tick = (l * total + s) * tps + swingTicks(s);
        if (tr.kind === 'drum') {
          note(tick, tps / 2, GM_DRUMS[tr.voice] || 37, v < 1 ? 60 : 100);
          continue;
        }
        const len = Math.round(gateSteps(tr, s, total, false) * tps);
        if (tr.kind === 'bass') {
          note(tick, len, bassMidi(p, v), 96); // real bass pitch for Logic
        } else if (isMelodic(tr)) {
          note(tick, len, BASE_MIDI[tr.kind] + p.key + v + tr.octave * 12, 96);
        } else {
          for (const n of chordMidi(chordAt(p, s).r, p.key, BASE_MIDI.chords + 2 + tr.octave * 12)) note(tick, len, n, 80);
        }
      }
    }
    chunks.push(trackChunk(ev));
  }
  const header = chunk('MThd', [0, 1, 0, chunks.length, (PPQ >> 8) & 255, PPQ & 255]);
  return new Uint8Array([...header, ...chunks.flat()]);
}
