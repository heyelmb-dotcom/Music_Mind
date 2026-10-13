// Tiny DOM helpers.
export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on')) el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'html') el.innerHTML = v;
    else if (k in el && typeof v !== 'string') el[k] = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  append(el, children);
  return el;
}

function append(el, children) {
  for (const c of children.flat(Infinity)) {
    if (c === null || c === undefined || c === false) continue;
    el.appendChild(c instanceof Node ? c : document.createTextNode(String(c)));
  }
}

export function mount(el, ...children) {
  el.replaceChildren();
  append(el, children);
}

export function toast(msg, ms = 2400) {
  const t = h('div', { class: 'toast' }, msg);
  document.body.appendChild(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => {
    t.classList.remove('show');
    setTimeout(() => t.remove(), 300);
  }, ms);
}

// Bottom sheet. Returns a close() function.
export function sheet(title, body, { onClose } = {}) {
  const close = () => {
    wrap.classList.remove('show');
    setTimeout(() => wrap.remove(), 200);
    onClose && onClose();
  };
  const wrap = h('div', { class: 'sheet-wrap', onclick: (e) => e.target === wrap && close() },
    h('div', { class: 'sheet' },
      h('div', { class: 'sheet-head' }, h('h3', {}, title), h('button', { class: 'btn ghost', onclick: close, 'aria-label': 'Close' }, '✕')),
      h('div', { class: 'sheet-body' }, body)));
  document.body.appendChild(wrap);
  requestAnimationFrame(() => wrap.classList.add('show'));
  return close;
}

export function download(filename, data, type) {
  const blob = data instanceof Blob ? data : new Blob([data], { type });
  const url = URL.createObjectURL(blob);
  const a = h('a', { href: url, download: filename });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export async function shareOrDownload(filename, bytes, type) {
  const file = new File([bytes], filename, { type });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: filename });
      return;
    } catch (e) {
      if (e.name === 'AbortError') return;
    }
  }
  download(filename, file, type);
}

export function pickFile(accept) {
  return new Promise((resolve) => {
    const inp = h('input', { type: 'file', accept, style: { display: 'none' } });
    inp.addEventListener('change', () => {
      const f = inp.files[0];
      inp.remove();
      if (!f) return resolve(null);
      f.text().then(resolve);
    });
    document.body.appendChild(inp);
    inp.click();
  });
}

export const select = (value, options, onchange, attrs = {}) =>
  h('select', { ...attrs, onchange: (e) => onchange(e.target.value) },
    options.map((o) => {
      const [v, label] = Array.isArray(o) ? o : [o, o];
      return h('option', { value: v, selected: String(v) === String(value) }, label);
    }));
