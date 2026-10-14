// A dot-matrix frame around every page: dense at the screen edges, fading toward
// the centre. It spreads in from the outside on each page change and brightens
// with whatever is playing.
import { peekAnalyser } from './audio.js';

const GAP = 13;          // px between dots
const REVEAL_MS = 1100;  // edge-to-centre spread on a page change
const reduce = matchMedia('(prefers-reduced-motion: reduce)');

let canvas, g, dots = [], W = 0, H = 0, dpr = 1;
let revealStart = -1e9, raf = 0, quietFrames = 0, level = 0, buf = null;

const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const hash = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };

function layout() {
  dpr = Math.min(2, devicePixelRatio || 1);
  W = innerWidth; H = innerHeight;
  canvas.width = W * dpr; canvas.height = H * dpr;
  canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
  dots = [];
  const cx = W / 2, cy = H / 2;
  const colHalf = Math.min(W / 2, 470); // the content column
  for (let y = GAP / 2; y < H; y += GAP) {
    for (let x = GAP / 2; x < W; x += GAP) {
      // distance to the edge: outside the content column counts fully, inside only vertically
      const dx = Math.abs(x - cx) > colHalf ? 1 : Math.abs(x - cx) / colHalf;
      const dy = Math.abs(y - cy) / (H / 2);
      const d = Math.max(dx * (W > 700 ? 1 : 0.9), dy);
      const r = hash(x, y);
      const base = smooth(W > 700 ? 0.62 : 0.72, 1.0, d) * (0.25 + 0.55 * r);
      if (base < 0.02 && r > 0.04) continue;
      dots.push({ x, y, d, r, base, red: r > 0.985 });
    }
  }
}

function draw(now) {
  const t = reduce.matches ? 1 : Math.min(1, (now - revealStart) / REVEAL_MS);
  const front = 1 - t * 0.55; // the reveal travels from the edge (1) inwards
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, W, H);
  for (const p of dots) {
    let a = p.base * smooth(front - 0.08, front + 0.04, p.d + p.r * 0.06);
    // music: edge dots brighten with the level, reaching a little further in
    if (level > 0.01) a += level * smooth(0.5, 1.0, p.d) * (0.4 + 0.6 * p.r);
    // a bright leading edge while the reveal is moving
    if (t < 1) a += 0.35 * Math.max(0, 1 - Math.abs(p.d - front) / 0.05) * p.r;
    if (a < 0.015) continue;
    g.globalAlpha = Math.min(0.85, a);
    g.fillStyle = p.red && level > 0.02 ? '#c4454b' : '#e9dfc7';
    g.fillRect(p.x - 0.75, p.y - 0.75, 1.5, 1.5);
  }
  return t < 1;
}

function readLevel() {
  const an = peekAnalyser();
  if (!an) return 0;
  if (!buf || buf.length !== an.fftSize) buf = new Uint8Array(an.fftSize);
  an.getByteTimeDomainData(buf);
  let sum = 0;
  for (let i = 0; i < buf.length; i += 4) { const v = (buf[i] - 128) / 128; sum += v * v; }
  return Math.min(1, Math.sqrt(sum / (buf.length / 4)) * 3.2);
}

function loop(now) {
  const target = reduce.matches ? 0 : readLevel();
  level += (target - level) * (target > level ? 0.5 : 0.12); // quick attack, slow release
  const moving = draw(now);
  quietFrames = level > 0.01 ? 0 : quietFrames + 1;
  // keep running while revealing, while sound is on, and briefly after; then sleep
  raf = moving || quietFrames < 30 ? requestAnimationFrame(loop) : 0;
}

function wake() { if (!raf) raf = requestAnimationFrame(loop); }

export function initDotField() {
  canvas = document.createElement('canvas');
  canvas.className = 'dotfield';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.prepend(canvas);
  g = canvas.getContext('2d');
  layout();
  addEventListener('resize', () => { layout(); wake(); });
  // sound starts from a tap; poll gently so the frame wakes up when audio begins
  setInterval(() => { if (!raf && peekAnalyser() && readLevel() > 0.02) wake(); }, 250);
  revealDots();
}

export function revealDots() {
  if (!canvas) return;
  revealStart = performance.now();
  wake();
}
