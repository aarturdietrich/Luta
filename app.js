import * as store from './store.js';
import { preparePhoto, dataUrlToBlob } from './photos.js';

// ---------- seed data (written once, the first time a PIN is used) ----------
const SEED = {
  info: {
    name: 'Luta', sex: 'Male', breed: 'Dachshund', colour: 'Brown & tan',
    birthday: '2026-08-28', breeder: 'Pethouse pet farm', breederPhone: '0379 889 868',
    vetName: 'HAKI PET', vetPhone: '', vetAddress: '', notes: '',
  },
  settings: { nextDeworming: '2026-11-01', dewormMonthly: true },
  vaccines: [
    { date: '2026-10-19', name: 'Zoetis Vanguard Plus 5', lot: '871450B', clinic: 'HAKI PET', notes: 'Shot 1', status: 'given' },
    { date: '2026-11-09', name: 'Vanguard Plus 5/CV-L', lot: '', clinic: 'HAKI PET', notes: 'Shot 2. Vaccine type to confirm with the vet.', status: 'scheduled' },
    { date: '2026-12-01', name: 'Shot 3 + Rabies', lot: '', clinic: 'HAKI PET', notes: 'Planned for early December. Exact date to confirm.', status: 'scheduled' },
  ],
};

const GREETINGS = [
  'Hello! How is Luta today?',
  'Woof! Did someone say treats?',
  'Belly rubs keep me healthy. Doctor’s orders.',
  'I’m small, but I’m very brave.',
  'Have you checked my ears today?',
  'I promise I didn’t chew that.',
  'Nap first, walkies later?',
  'Long dog, big heart.',
];

const ICON = {
  home: '<svg viewBox="0 0 24 24"><path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z"/></svg>',
  syringe: '<svg viewBox="0 0 24 24"><path d="m18 2 4 4M20 4l-4 4M14 4l6 6M16 6l-9 9-2 4 4-2 9-9M10.5 8.5l2 2M8 11l2 2M2.5 21.5 5 19"/></svg>',
  pill: '<svg viewBox="0 0 24 24"><path d="M10.5 20.5a5 5 0 0 1-7-7l10-10a5 5 0 0 1 7 7z"/><path d="m8.5 8.5 7 7"/></svg>',
  scale: '<svg viewBox="0 0 24 24"><rect x="3.5" y="3.5" width="17" height="17" rx="5"/><path d="M8 11a5 5 0 0 1 8 0M12 11l1.6-2.2"/></svg>',
  paw: '<svg viewBox="0 0 24 24"><circle cx="6" cy="10" r="1.8"/><circle cx="10" cy="5.8" r="1.8"/><circle cx="14" cy="5.8" r="1.8"/><circle cx="18" cy="10" r="1.8"/><path d="M12 11.5c-3 0-5.5 3.6-5.5 5.6 0 1.4 1 2.4 2.3 2.4 1.2 0 2-.6 3.2-.6s2 .6 3.2.6c1.3 0 2.3-1 2.3-2.4 0-2-2.5-5.6-5.5-5.6z"/></svg>',
  plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  phone: '<svg viewBox="0 0 24 24"><path d="M5 4h3.5l1.5 4-2 1.5a11 11 0 0 0 6.5 6.5l1.5-2 4 1.5V19a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1z"/></svg>',
  chat: '<svg viewBox="0 0 24 24"><path d="M20 12a8 8 0 0 1-11.6 7.1L4 20l1-4.2A8 8 0 1 1 20 12z"/></svg>',
  bell: '<svg viewBox="0 0 24 24"><path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15zM10 20.5a2 2 0 0 0 4 0"/></svg>',
  check: '<svg viewBox="0 0 24 24"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
  photo: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="3.5"/><circle cx="9" cy="10" r="1.6"/><path d="m20.5 15.5-4-4L8 19"/></svg>',
  close: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  share: '<svg viewBox="0 0 24 24"><path d="M12 3v12M8 7l4-4 4 4M6 11H5a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7a1 1 0 0 0-1-1h-1"/></svg>',
};

const TABS = { home: ['home', 'Home'], photos: ['photo', 'Photos'], vaccines: ['syringe', 'Vaccines'], deworm: ['pill', 'Deworm'], weight: ['scale', 'Weight'], info: ['paw', 'Luta'] };

// ---------- helpers ----------
const $ = (s, el = document) => el.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const parse = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const todayISO = () => iso(new Date());
const daysUntil = s => Math.round((parse(s) - parse(todayISO())) / 86400000);
const fmt = (s, o = { weekday: 'short', day: 'numeric', month: 'short' }) => parse(s).toLocaleDateString('en-GB', o);
const fmtLong = s => fmt(s, { day: 'numeric', month: 'short', year: 'numeric' });
const firstOfNextMonth = s => { const d = parse(s); return iso(new Date(d.getFullYear(), d.getMonth() + 1, 1)); };
const fmtKg = n => Number(n).toLocaleString('en-GB', { maximumFractionDigits: 2 });
const toNum = v => { const n = parseFloat(String(v).replace(',', '.')); return Number.isFinite(n) ? n : null; };
const telHref = p => 'tel:' + String(p).replace(/[^\d+]/g, '');

function relText(date) {
  const d = daysUntil(date);
  if (d === 0) return 'Today';
  if (d === 1) return 'Tomorrow';
  if (d === -1) return 'Yesterday';
  return d > 0 ? `In ${d} days` : `${-d} days ago`;
}

// ---------- state ----------
const state = { vaccines: [], deworming: [], weights: [], photos: [], meta: {} };
const info = () => state.meta.info || {};
const settings = () => state.meta.settings || {};
const byDate = (a, b) => a.date.localeCompare(b.date);
const scheduledVaccines = () => state.vaccines.filter(v => v.status === 'scheduled').sort(byDate);
const givenVaccines = () => state.vaccines.filter(v => v.status !== 'scheduled').sort(byDate).reverse();
const latestWeight = () => [...state.weights].sort(byDate).at(-1);

let route = 'home';
let ready = false;

function ageText() {
  const b = info().birthday;
  if (!b) return '';
  const days = -daysUntil(b);
  if (days < 0) return '';
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} old`;
  if (days >= 182) { const m = Math.floor(days / 30.44); return m >= 24 ? `${Math.floor(m / 12)} years old` : `${m} months old`; }
  const w = Math.floor(days / 7), d = days % 7;
  return `${w} weeks${d ? ` & ${d} day${d > 1 ? 's' : ''}` : ''} old`;
}

// ---------- views ----------
const pageHead = (title, sub, act, label = 'Add') => `
  <header class="page-head fi">
    <div><h1>${esc(title)}</h1><p>${esc(sub)}</p></div>
    ${act ? `<button class="btn btn-primary btn-round" data-act="${act}">${label === 'Add' ? ICON.plus : ''}<span>${label}</span></button>` : ''}
  </header>`;

const empty = text => `<div class="empty fi">${esc(text)}</div>`;

function countdown(date) {
  const d = daysUntil(date);
  if (d === 0) return { num: 'Today', label: 'it’s the day!', tone: 'today' };
  if (d > 0) return { num: d, label: d === 1 ? 'day to go' : 'days to go', tone: d <= 3 ? 'soon' : '' };
  return { num: -d, label: d === -1 ? 'day overdue' : 'days overdue', tone: 'late' };
}

function countCard(kind, title, icon, item, go) {
  if (!item) {
    return `<button class="card count ${kind} fi" data-go="${go}">
      <div class="eyebrow">${ICON[icon]}${title}</div>
      <div class="count-empty">Nothing scheduled</div>
      <div class="count-date">Tap to add</div></button>`;
  }
  const c = countdown(item.date);
  return `<button class="card count ${kind} ${c.tone} fi" data-go="${go}">
    <div class="eyebrow">${ICON[icon]}${title}</div>
    <div class="count-num ${typeof c.num === 'string' ? 'word' : ''}">${c.num}</div>
    <div class="count-label">${c.label}</div>
    <div class="count-date">${fmt(item.date)}</div>
    ${item.detail ? `<div class="count-detail">${esc(item.detail)}</div>` : ''}
  </button>`;
}

const views = {};

views.home = () => {
  const v = scheduledVaccines()[0];
  const s = settings();
  const w = latestWeight();
  return `
  ${store.cloud ? '' : '<div class="demo-chip fi">Demo mode: saved on this phone only</div>'}
  <section class="hero fi">
    <div class="bubble"><span id="bubble-text">${esc(GREETINGS[greetIdx])}</span></div>
    <div class="avatar-ring floaty"><img class="avatar" src="luta.jpg" alt="Luta"></div>
    <h1 class="hero-name">${esc(info().name || 'Luta')}</h1>
    <p class="hero-sub">${esc(ageText())}</p>
  </section>
  <div class="count-grid">
    ${countCard('vax', 'Next vaccine', 'syringe', v && { date: v.date, detail: v.name }, 'vaccines')}
    ${countCard('deworm', 'Next deworming', 'pill', s.nextDeworming && { date: s.nextDeworming, detail: s.dewormMonthly ? 'Monthly, on the 1st' : '' }, 'deworm')}
  </div>
  <div class="card weight-mini fi">
    <div>
      <div class="eyebrow">${ICON.scale}Latest weight</div>
      <div class="weight-val">${w ? `${fmtKg(w.kg)}<small> kg</small>` : '<span class="muted">Not logged yet</span>'}</div>
      <div class="muted small">${w ? fmtLong(w.date) : 'Optional, whenever you like'}</div>
    </div>
    <button class="btn btn-soft" data-act="add-weight">${ICON.plus}<span>Weight</span></button>
  </div>
  ${latestPhotoCard()}`;
};

function latestPhotoCard() {
  const p = state.photos[0];
  if (!p) {
    return `<button class="card photo-empty small-empty fi" data-act="add-photos">${ICON.photo}
      <strong>Add Luta’s first photo</strong></button>`;
  }
  return `<button class="card photo-mini fi" data-act="open-photo" data-id="${p.id}">
    <img src="${fullCache.get(p.id) || p.thumb}" alt="${esc(p.caption || 'Latest photo of Luta')}">
    <div class="photo-mini-label"><span class="eyebrow">${ICON.photo}Latest photo</span>
      <span>${esc(p.caption || fmtLong(p.date))}</span></div>
  </button>`;
}

// ---------- photos ----------
// Firestore's free plan holds 1 GB in total; photos are by far the biggest thing in it.
const PHOTO_PAGE = 60;
let photoLimit = PHOTO_PAGE;
const fullCache = new Map();
const mb = bytes => `${(bytes / 1048576).toFixed(bytes < 10485760 ? 1 : 0)} MB`;

async function fullImage(id) {
  if (fullCache.has(id)) return fullCache.get(id);
  const d = await store.get('photoData', id);
  if (!d) return null;
  fullCache.set(id, d.data);
  if (fullCache.size > 12) fullCache.delete(fullCache.keys().next().value);
  return d.data;
}

views.photos = () => {
  const st = state.meta.stats || {};
  const count = st.photoCount || state.photos.length;
  const sub = count ? `${count} photo${count === 1 ? '' : 's'} · ${mb(st.photoBytes || 0)} of 1 GB used` : 'Luta’s little moments';
  const groups = [];
  for (const p of state.photos) {
    const key = p.date.slice(0, 7);
    if (groups.at(-1)?.key !== key) groups.push({ key, items: [] });
    groups.at(-1).items.push(p);
  }
  return `${pageHead('Photos', sub, 'add-photos')}
    ${store.cloud ? '' : '<div class="demo-chip fi">Demo mode: photos vanish when you reload</div>'}
    ${groups.length ? groups.map(g => `
      <h2 class="section fi">${parse(g.key + '-01').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</h2>
      <div class="pgrid fi">${g.items.map(p => `<button class="pcell" data-act="open-photo" data-id="${p.id}">
        <img src="${p.thumb}" alt="${esc(p.caption || 'Photo of Luta')}" loading="lazy" decoding="async"></button>`).join('')}</div>`).join('')
    : `<button class="card photo-empty fi" data-act="add-photos">${ICON.photo}
        <strong>Add Luta’s first photos</strong>
        <span class="muted small">Pick several at once from your camera roll</span></button>`}
    ${count > state.photos.length ? '<button class="btn btn-soft btn-wide fi" data-act="more-photos">Show older photos</button>' : ''}`;
};

async function uploadPhotos(files) {
  let added = 0;
  for (const [i, file] of files.entries()) {
    toast(files.length > 1 ? `Adding photo ${i + 1} of ${files.length}…` : 'Adding photo…', 60000);
    try {
      const p = await preparePhoto(file);
      const id = store.newId();
      const bytes = p.full.length + p.thumb.length;
      // The big version goes in its own document so the grid only downloads thumbnails.
      store.put('photoData', id, { data: p.full }).catch(fail);
      store.put('photos', id, {
        takenAt: p.takenAt.toISOString(), date: iso(p.takenAt), caption: '',
        thumb: p.thumb, w: p.w, h: p.h, bytes, addedAt: new Date().toISOString(),
      }).catch(fail);
      store.bump('meta', 'stats', { photoCount: 1, photoBytes: bytes }).catch(fail);
      fullCache.set(id, p.full);
      added++;
    } catch (err) {
      console.error(err);
    }
  }
  const missed = files.length - added;
  toast(missed ? `${added} added, ${missed} couldn’t be read` : added === 1 ? 'Photo added 🐾' : `${added} photos added 🐾`);
}

// Full-screen viewer: swipe left/right, edit caption, save/share, delete.
let viewerId = null;
let viewerIdx = 0;

function openViewer(id) {
  viewerId = id;
  const root = $('#viewer');
  root.innerHTML = `
    <div class="viewer-top">
      <button class="vbtn" data-v="close" aria-label="Close">${ICON.close}</button>
      <span class="viewer-count"></span>
      <button class="vbtn" data-v="share" aria-label="Save or share">${ICON.share}</button>
    </div>
    <div class="viewer-stage"><img class="viewer-img" alt="" draggable="false"></div>
    <div class="viewer-bottom">
      <div class="viewer-text"><div class="viewer-caption"></div><div class="viewer-date"></div></div>
      <div class="viewer-actions">
        <button class="btn btn-mini" data-v="edit">Edit</button>
        <button class="btn btn-mini vdel" data-v="delete">Delete</button>
      </div>
    </div>`;
  root.classList.add('open');
  document.body.classList.add('no-scroll');
  showPhoto();
}

function showPhoto() {
  const i = state.photos.findIndex(p => p.id === viewerId);
  if (i < 0) return closeViewer();
  viewerIdx = i;
  const p = state.photos[i];
  const root = $('#viewer');
  const img = $('.viewer-img', root);
  img.src = fullCache.get(p.id) || p.thumb;
  img.alt = p.caption || 'Photo of Luta';
  $('.viewer-count', root).textContent = `${i + 1} of ${Math.max(state.meta.stats?.photoCount || 0, state.photos.length)}`;
  $('.viewer-caption', root).textContent = p.caption || '';
  $('.viewer-date', root).textContent = fmt(p.date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const del = $('.vdel', root);
  del.classList.remove('confirm');
  del.textContent = 'Delete';
  fullImage(p.id).then(src => { if (src && viewerId === p.id) img.src = src; }).catch(console.warn);
}

function closeViewer() {
  const root = $('#viewer');
  viewerId = null;
  root.classList.remove('open');
  document.body.classList.remove('no-scroll');
  setTimeout(() => { if (!root.classList.contains('open')) root.innerHTML = ''; }, 300);
}

function stepViewer(d) {
  const next = state.photos[viewerIdx + d];
  if (next) { viewerId = next.id; showPhoto(); }
}

// Called whenever the photo list changes (a delete here, or an upload from the other phone).
function syncViewer() {
  if (!viewerId) return;
  if (!state.photos.some(p => p.id === viewerId)) {
    viewerId = state.photos[Math.min(viewerIdx, state.photos.length - 1)]?.id || null;
  }
  if (viewerId) showPhoto(); else closeViewer();
}

function sharePhoto(p) {
  // Kept synchronous up to navigator.share, which iPhones only allow straight from a tap.
  const blob = dataUrlToBlob(fullCache.get(p.id) || p.thumb);
  const file = new File([blob], `luta-${p.date}.jpg`, { type: 'image/jpeg' });
  if (navigator.canShare?.({ files: [file] })) {
    navigator.share({ files: [file] }).catch(() => {});
    return;
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = file.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function photoForm(p) {
  openSheet({
    title: 'Edit photo',
    body: `${textarea('caption', 'Caption', p.caption)}
      ${field('date', 'Date taken', 'date', p.date, 'required')}`,
    onSave: f => store.put('photos', p.id, {
      caption: f.caption,
      ...(f.date !== p.date && { date: f.date, takenAt: new Date(parse(f.date).getTime() + 12 * 3600e3).toISOString() }),
    }),
  });
}

function deletePhoto(p) {
  toast('Photo deleted');
  return Promise.all([
    store.del('photos', p.id),
    store.del('photoData', p.id),
    store.bump('meta', 'stats', { photoCount: -1, photoBytes: -(p.bytes || 0) }),
  ]).catch(fail);
}

let swipeX = null;
$('#viewer').addEventListener('pointerdown', e => { swipeX = e.clientX; });
$('#viewer').addEventListener('pointerup', e => {
  if (swipeX == null) return;
  const dx = e.clientX - swipeX;
  swipeX = null;
  if (Math.abs(dx) > 50) stepViewer(dx < 0 ? 1 : -1);
});
$('#viewer').addEventListener('click', e => {
  const b = e.target.closest('[data-v]');
  const p = state.photos[viewerIdx];
  if (!b || !p) return;
  if (b.dataset.v === 'close') closeViewer();
  if (b.dataset.v === 'share') sharePhoto(p);
  if (b.dataset.v === 'edit') photoForm(p);
  if (b.dataset.v === 'delete') {
    if (!b.classList.contains('confirm')) { b.classList.add('confirm'); b.textContent = 'Tap again'; return; }
    deletePhoto(p);
  }
});

$('#photo-input').addEventListener('change', e => {
  const files = [...e.target.files];
  e.target.value = '';
  if (files.length) uploadPhotos(files);
});

function dateBlock(date) {
  const d = parse(date);
  return `<div class="entry-date"><span class="d">${d.getDate()}</span><span class="m">${d.toLocaleDateString('en-GB', { month: 'short' })}</span><span class="y">${d.getFullYear()}</span></div>`;
}

function vaccineCard(v, isNext) {
  const meta = [v.lot && `Lot ${esc(v.lot)}`, esc(v.clinic)].filter(Boolean).join(' · ');
  return `<article class="card entry ${isNext ? 'is-next' : ''} fi" data-act="edit-vaccine" data-id="${v.id}" tabindex="0">
    ${dateBlock(v.date)}
    <div class="entry-body">
      <div class="entry-title">${esc(v.name)}${isNext ? '<span class="badge">Next</span>' : ''}</div>
      ${meta ? `<div class="entry-meta">${meta}</div>` : ''}
      ${v.notes ? `<div class="entry-notes">${esc(v.notes)}</div>` : ''}
      ${v.status === 'scheduled' ? `<div class="entry-foot"><span class="when ${daysUntil(v.date) < 0 ? 'late' : ''}">${relText(v.date)}</span>
        <button class="btn btn-mini" data-act="mark-given" data-id="${v.id}">${ICON.check}<span>Mark as given</span></button></div>` : ''}
    </div>
  </article>`;
}

views.vaccines = () => {
  const up = scheduledVaccines(), given = givenVaccines();
  return `${pageHead('Vaccine booklet', 'Every shot, in one place', 'add-vaccine')}
    <h2 class="section fi">Scheduled</h2>
    ${up.length ? up.map((v, i) => vaccineCard(v, i === 0)).join('') : empty('Nothing scheduled. Add the next one when the vet tells you.')}
    <h2 class="section fi">Given</h2>
    ${given.length ? given.map(v => vaccineCard(v)).join('') : empty('No vaccines recorded yet.')}`;
};

views.deworm = () => {
  const s = settings();
  const list = [...state.deworming].sort(byDate).reverse();
  const late = s.nextDeworming && daysUntil(s.nextDeworming) < 0;
  return `${pageHead('Deworming', 'Keeping that little tummy happy', 'add-deworm')}
    <div class="card next-card fi">
      <div>
        <div class="eyebrow">${ICON.pill}Next due</div>
        <div class="next-date">${s.nextDeworming ? fmt(s.nextDeworming, { weekday: 'short', day: 'numeric', month: 'long' }) : 'Not set'}</div>
        <div class="small ${late ? 'late-text' : 'muted'}">${s.nextDeworming ? relText(s.nextDeworming) : ''}${s.dewormMonthly ? ' · repeats monthly on the 1st' : ''}</div>
      </div>
      <button class="btn btn-soft" data-act="edit-next-deworm">Change</button>
    </div>
    <h2 class="section fi">History</h2>
    ${list.length ? list.map(d => `<article class="card entry fi" data-act="edit-deworm" data-id="${d.id}" tabindex="0">
      ${dateBlock(d.date)}
      <div class="entry-body">
        <div class="entry-title">${esc(d.product)}</div>
        <div class="entry-meta">${[d.dose && esc(d.dose), d.weight != null && `${fmtKg(d.weight)} kg`].filter(Boolean).join(' · ')}</div>
        ${d.notes ? `<div class="entry-notes">${esc(d.notes)}</div>` : ''}
      </div></article>`).join('') : empty('No doses logged yet. Tap Add after each deworming.')}`;
};

// Single-series line chart, hand-built SVG.
const CH = { W: 340, H: 180, l: 34, r: 18, t: 18, b: 28 };

function weightChart(pts) {
  const { W, H, l, r, t, b } = CH;
  const ts = pts.map(p => parse(p.date).getTime());
  let x0 = Math.min(...ts), x1 = Math.max(...ts);
  if (x0 === x1) { x0 -= 3 * 864e5; x1 += 3 * 864e5; }
  const ks = pts.map(p => p.kg);
  let lo = Math.min(...ks), hi = Math.max(...ks);
  const pad = Math.max((hi - lo) * 0.2, 0.2);
  lo = Math.max(0, lo - pad); hi += pad;
  const X = tt => l + (tt - x0) / (x1 - x0) * (W - l - r);
  const Y = v => t + (1 - (v - lo) / (hi - lo)) * (H - t - b);
  const xy = pts.map((p, i) => ({ x: X(ts[i]), y: Y(p.kg), p }));
  const line = xy.map((q, i) => `${i ? 'L' : 'M'}${q.x.toFixed(1)},${q.y.toFixed(1)}`).join('');
  const area = `${line}L${xy.at(-1).x.toFixed(1)},${H - b}L${xy[0].x.toFixed(1)},${H - b}Z`;
  const ticks = [0, 0.5, 1].map(f => lo + (hi - lo) * f);
  const last = xy.at(-1);
  return `<div class="chart" data-points='${JSON.stringify(xy.map(q => [q.x, q.y, q.p.kg, q.p.date]))}'>
    <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Weight over time">
      <defs><linearGradient id="wfill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--tan)" stop-opacity=".28"/><stop offset="1" stop-color="var(--tan)" stop-opacity="0"/></linearGradient></defs>
      ${ticks.map(v => `<line class="grid" x1="${l}" x2="${W - r}" y1="${Y(v)}" y2="${Y(v)}"/><text class="axis" x="${l - 6}" y="${Y(v) + 4}" text-anchor="end">${v.toFixed(1)}</text>`).join('')}
      ${pts.length > 1 ? `<path d="${area}" fill="url(#wfill)"/><path class="wline" d="${line}"/>` : ''}
      ${xy.map(q => `<circle class="wdot" cx="${q.x}" cy="${q.y}" r="4"/>`).join('')}
      <text class="axis" x="${l}" y="${H - 8}">${fmt(pts[0].date, { day: 'numeric', month: 'short' })}</text>
      ${pts.length > 1 ? `<text class="axis" x="${W - r}" y="${H - 8}" text-anchor="end">${fmt(pts.at(-1).date, { day: 'numeric', month: 'short' })}</text>` : ''}
      <text class="dlabel" x="${Math.min(last.x, W - r - 4)}" y="${last.y - 10}" text-anchor="${last.x > W - 60 ? 'end' : 'middle'}">${fmtKg(last.p.kg)} kg</text>
      <line class="xhair" x1="0" x2="0" y1="${t}" y2="${H - b}" visibility="hidden"/>
    </svg>
    <div class="tip" hidden></div>
  </div>`;
}

views.weight = () => {
  const pts = [...state.weights].sort(byDate);
  return `${pageHead('Weight', 'Optional, whenever you like', 'add-weight')}
    <div class="card chart-card fi">
      ${pts.length ? weightChart(pts) : '<div class="chart-empty">Add a weight and a little growth chart will appear here.</div>'}
    </div>
    ${pts.length ? `<h2 class="section fi">All entries</h2>
    <div class="card list fi">${[...pts].reverse().map(w => `<button class="row" data-act="edit-weight" data-id="${w.id}">
      <span>${fmtLong(w.date)}</span><strong>${fmtKg(w.kg)} kg</strong></button>`).join('')}</div>` : ''}`;
};

function wireChart() {
  const chart = $('.chart');
  if (!chart) return;
  const pts = JSON.parse(chart.dataset.points);
  const svg = $('svg', chart), hair = $('.xhair', chart), tip = $('.tip', chart);
  const show = e => {
    const box = svg.getBoundingClientRect();
    const vx = (e.clientX - box.left) / box.width * CH.W;
    const q = pts.reduce((a, c) => Math.abs(c[0] - vx) < Math.abs(a[0] - vx) ? c : a);
    hair.setAttribute('x1', q[0]); hair.setAttribute('x2', q[0]); hair.setAttribute('visibility', 'visible');
    tip.hidden = false;
    tip.innerHTML = `<strong>${fmtKg(q[2])} kg</strong><span>${fmtLong(q[3])}</span>`;
    tip.style.left = `${q[0] / CH.W * 100}%`;
    tip.style.top = `${q[1] / CH.H * 100}%`;
  };
  const hide = () => { hair.setAttribute('visibility', 'hidden'); tip.hidden = true; };
  svg.addEventListener('pointermove', show);
  svg.addEventListener('pointerdown', show);
  svg.addEventListener('pointerleave', hide);
}

function pushPanel() {
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  let text, btn = '';
  if (!store.cloud) {
    text = 'Reminders start working once Firebase is set up (SETUP.md).';
  } else if (ios && !standalone) {
    text = 'On iPhone, first add Luta to your Home Screen (Share → Add to Home Screen), then open it from there to turn on reminders.';
  } else if (!('Notification' in window) || !('serviceWorker' in navigator)) {
    text = 'This browser can’t show notifications.';
  } else if (Notification.permission === 'denied') {
    text = 'Notifications are blocked for Luta. Allow them in your phone’s settings, then come back here.';
  } else if (Notification.permission === 'granted' && localStorage.getItem('luta:push')) {
    text = 'Reminders are on for this phone: 3 days before and on the day of each vaccine and deworming.';
    btn = '<button class="btn btn-soft" data-act="enable-push">Refresh</button>';
  } else {
    text = 'Get a nudge 3 days before and on the day of each vaccine and deworming.';
    btn = `<button class="btn btn-primary" data-act="enable-push">${ICON.bell}<span>Turn on</span></button>`;
  }
  return `<div class="card push fi"><p>${text}</p>${btn}</div>`;
}

views.info = () => {
  const i = info();
  const row = (k, v) => v ? `<div class="row static"><span>${k}</span><strong>${esc(v)}</strong></div>` : '';
  const phoneDigits = String(i.breederPhone || '').replace(/\D/g, '');
  return `${pageHead(i.name || 'Luta', 'All about this little sausage', 'edit-info', 'Edit')}
    <div class="card profile fi">
      <img class="avatar sm" src="luta.jpg" alt="">
      <div><div class="entry-title">${esc(i.name)}</div>
      <div class="muted">${esc([i.sex, i.colour, i.breed].filter(Boolean).join(' · '))}</div>
      <div class="muted small">${ageText()}</div></div>
    </div>
    <div class="card list fi">
      ${row('Born', i.birthday && fmtLong(i.birthday))}
      ${row('From', i.breeder)}
      ${i.breederPhone ? `<div class="row static"><span>Breeder</span><span class="row-actions">
        <a class="btn btn-mini" href="${telHref(i.breederPhone)}">${ICON.phone}<span>Call</span></a>
        <a class="btn btn-mini" href="https://zalo.me/${phoneDigits}" target="_blank" rel="noopener">${ICON.chat}<span>Zalo</span></a></span></div>` : ''}
      ${i.notes ? `<div class="row static notes">${esc(i.notes)}</div>` : ''}
    </div>
    <h2 class="section fi">Vet</h2>
    <div class="card vet fi">
      <div class="vet-name">${esc(i.vetName || 'No vet saved')}</div>
      ${i.vetAddress ? `<a class="muted small" href="https://maps.google.com/?q=${encodeURIComponent(i.vetAddress)}" target="_blank" rel="noopener">${esc(i.vetAddress)}</a>` : ''}
      ${i.vetPhone
        ? `<a class="btn btn-primary btn-wide" href="${telHref(i.vetPhone)}">${ICON.phone}<span>Call ${esc(i.vetPhone)}</span></a>`
        : '<button class="btn btn-soft btn-wide" data-act="edit-info">Add the vet’s phone number</button>'}
    </div>
    <h2 class="section fi">Reminders</h2>
    ${pushPanel()}
    <h2 class="section fi">This phone</h2>
    <div class="card list fi">
      <div class="row static"><span>Data</span><strong>${store.cloud ? 'Shared via Firebase' : 'Demo (this phone only)'}</strong></div>
      <button class="row" data-act="lock"><span>Lock and forget PIN on this phone</span><strong>›</strong></button>
    </div>`;
};

// ---------- rendering ----------
function render(animate = false) {
  if (!ready) return;
  const view = $('#view');
  view.dataset.anim = animate ? '1' : '0';
  view.innerHTML = views[route]();
  view.querySelectorAll('.fi').forEach((el, i) => el.style.setProperty('--i', Math.min(i, 10)));
  document.querySelectorAll('.tabbar [data-go]').forEach(b => b.classList.toggle('active', b.dataset.go === route));
  if (route === 'weight') wireChart();
  if (animate) window.scrollTo({ top: 0 });
}

function routeFromHash() {
  const r = location.hash.slice(1);
  return views[r] ? r : 'home';
}

const go = r => { if (location.hash.slice(1) === r) render(true); else location.hash = r; };
addEventListener('hashchange', () => { route = routeFromHash(); render(true); });

let greetIdx = Math.floor(Math.random() * GREETINGS.length);
setInterval(() => {
  const el = $('#bubble-text');
  if (!el || document.hidden) return;
  el.classList.add('out');
  setTimeout(() => {
    greetIdx = (greetIdx + 1) % GREETINGS.length;
    const age = ageText();
    el.textContent = greetIdx === 0 && age ? `I’m ${age} today!` : GREETINGS[greetIdx];
    el.classList.remove('out');
  }, 320);
}, 5500);

let toastTimer;
function toast(msg, ms = 2800) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), ms);
}

function fail(err) {
  console.error(err);
  toast(err?.code === 'permission-denied' ? 'Not allowed by the database rules (see SETUP.md).' : 'Couldn’t save. Check your connection.');
}

// ---------- bottom sheet ----------
const field = (name, label, type = 'text', value = '', extra = '') =>
  `<label class="field"><span>${label}</span><input name="${name}" type="${type}" value="${esc(value)}" ${extra}></label>`;
const textarea = (name, label, value = '') =>
  `<label class="field"><span>${label}</span><textarea name="${name}" rows="2">${esc(value)}</textarea></label>`;

function closeSheet() {
  const root = $('#sheet-root');
  root.classList.remove('open');
  setTimeout(() => { if (!root.classList.contains('open')) root.innerHTML = ''; }, 350);
}

function openSheet({ title, body, onSave, onDelete, saveLabel = 'Save', onInput, onCancel }) {
  const root = $('#sheet-root');
  root.innerHTML = `<div class="backdrop" data-sheet="cancel"></div>
    <form class="sheet" autocomplete="off">
      <div class="grab"></div>
      <h2>${title}</h2>
      ${body}
      <div class="sheet-actions">
        ${onDelete ? '<button type="button" class="btn btn-danger" data-sheet="delete">Delete</button>' : ''}
        <span class="spacer"></span>
        <button type="button" class="btn btn-ghost" data-sheet="cancel">Cancel</button>
        <button type="submit" class="btn btn-primary">${saveLabel}</button>
      </div>
    </form>`;
  requestAnimationFrame(() => root.classList.add('open'));
  const form = $('.sheet', root);
  form.addEventListener('submit', e => {
    e.preventDefault();
    const data = Object.fromEntries([...new FormData(form)].map(([k, v]) => [k, typeof v === 'string' ? v.trim() : v]));
    closeSheet();
    Promise.resolve().then(() => onSave(data, form)).catch(fail);
  });
  if (onInput) form.addEventListener('input', e => onInput(e, form));
  root.onclick = e => {
    const a = e.target.closest('[data-sheet]');
    if (!a) return;
    if (a.dataset.sheet === 'cancel') { closeSheet(); onCancel?.(); }
    if (a.dataset.sheet === 'delete') {
      if (!a.classList.contains('confirm')) { a.classList.add('confirm'); a.textContent = 'Tap again to delete'; return; }
      closeSheet();
      Promise.resolve().then(onDelete).then(() => toast('Deleted')).catch(fail);
    }
  };
}

const confirmSheet = (title, message, okLabel) => new Promise(resolve => openSheet({
  title, body: `<p class="sheet-text">${message}</p>`, saveLabel: okLabel,
  onSave: () => resolve(true), onCancel: () => resolve(false),
}));

addEventListener('keydown', e => {
  const sheet = $('#sheet-root.open .backdrop');
  if (e.key === 'Escape') { if (sheet) sheet.click(); else if (viewerId) closeViewer(); }
  if (viewerId && !sheet && e.key === 'ArrowRight') stepViewer(1);
  if (viewerId && !sheet && e.key === 'ArrowLeft') stepViewer(-1);
});

// ---------- forms ----------
function vaccineForm(v = {}) {
  const status = v.status || 'given';
  openSheet({
    title: v.id ? 'Edit vaccine' : 'Add vaccine',
    body: `
      <div class="seg">
        <label><input type="radio" name="status" value="given" ${status === 'given' ? 'checked' : ''}><span>Given</span></label>
        <label><input type="radio" name="status" value="scheduled" ${status === 'scheduled' ? 'checked' : ''}><span>Scheduled</span></label>
      </div>
      ${field('date', 'Date', 'date', v.date || todayISO(), 'required')}
      ${field('name', 'Vaccine', 'text', v.name, 'required list="vax-names" placeholder="e.g. Vanguard Plus 5"')}
      <div class="field-row">
        ${field('lot', 'Lot number', 'text', v.lot)}
        ${field('clinic', 'Clinic', 'text', v.clinic ?? info().vetName ?? '')}
      </div>
      ${textarea('notes', 'Notes', v.notes)}
      <datalist id="vax-names">${['Zoetis Vanguard Plus 5', 'Vanguard Plus 5/CV-L', 'Rabies', 'Shot 3 + Rabies'].map(n => `<option value="${n}">`).join('')}</datalist>`,
    onSave: d => {
      const data = { date: d.date, name: d.name, lot: d.lot, clinic: d.clinic, notes: d.notes, status: d.status };
      const p = v.id ? store.put('vaccines', v.id, data) : store.add('vaccines', data);
      toast(v.id ? 'Saved' : 'Vaccine added');
      return p;
    },
    onDelete: v.id && (() => store.del('vaccines', v.id)),
  });
}

function suggestNextDeworm(date) {
  const s = settings();
  if (!s.dewormMonthly) return s.nextDeworming || '';
  const candidate = firstOfNextMonth(date);
  return s.nextDeworming && s.nextDeworming > candidate ? s.nextDeworming : candidate;
}

function dewormForm(d = {}) {
  const date = d.date || todayISO();
  const w = latestWeight();
  openSheet({
    title: d.id ? 'Edit deworming' : 'Log deworming',
    body: `
      ${field('date', 'Date given', 'date', date, 'required')}
      ${field('product', 'Product', 'text', d.product, 'required list="dw-names" placeholder="e.g. Drontal Puppy"')}
      <div class="field-row">
        ${field('dose', 'Dose', 'text', d.dose, 'placeholder="e.g. 1 ml"')}
        ${field('weight', 'Weight (kg)', 'text', d.weight ?? w?.kg ?? '', 'inputmode="decimal"')}
      </div>
      ${textarea('notes', 'Notes', d.notes)}
      ${d.id ? '' : `${field('next', 'Next due date', 'date', suggestNextDeworm(date))}
        <p class="hint">You’ll get a reminder 3 days before and on the day.</p>`}
      <datalist id="dw-names">${[...new Set(state.deworming.map(x => x.product).filter(Boolean))].map(n => `<option value="${esc(n)}">`).join('')}</datalist>`,
    onInput: (e, form) => {
      if (e.target.name === 'date' && form.next && e.target.value) form.next.value = suggestNextDeworm(e.target.value);
    },
    onSave: f => {
      const data = { date: f.date, product: f.product, dose: f.dose, weight: toNum(f.weight), notes: f.notes };
      const jobs = [d.id ? store.put('deworming', d.id, data) : store.add('deworming', data)];
      if (!d.id && f.next) {
        jobs.push(store.put('meta', 'settings', { nextDeworming: f.next }));
        toast(`Logged. Next one: ${fmt(f.next)}`);
      } else toast('Saved');
      return Promise.all(jobs);
    },
    onDelete: d.id && (() => store.del('deworming', d.id)),
  });
}

function nextDewormForm() {
  const s = settings();
  openSheet({
    title: 'Next deworming',
    body: `${field('next', 'Due date', 'date', s.nextDeworming || '', 'required')}
      <label class="check"><input type="checkbox" name="monthly" ${s.dewormMonthly ? 'checked' : ''}><span>Repeat monthly on the 1st</span></label>
      <p class="hint">When repeating is on, logging a dose moves this to the 1st of the following month for you.</p>`,
    onSave: f => store.put('meta', 'settings', { nextDeworming: f.next, dewormMonthly: Boolean(f.monthly) }),
  });
}

function weightForm(w = {}) {
  openSheet({
    title: w.id ? 'Edit weight' : 'Add weight',
    body: `<div class="field-row">
      ${field('date', 'Date', 'date', w.date || todayISO(), 'required')}
      ${field('kg', 'Weight (kg)', 'text', w.kg ?? '', 'required inputmode="decimal" placeholder="e.g. 1.8" autofocus')}
    </div>`,
    onSave: f => {
      const kg = toNum(f.kg);
      if (kg == null || kg <= 0) { toast('Please enter a weight in kg'); return; }
      toast(w.id ? 'Saved' : `${fmtKg(kg)} kg logged`);
      return w.id ? store.put('weights', w.id, { date: f.date, kg }) : store.add('weights', { date: f.date, kg });
    },
    onDelete: w.id && (() => store.del('weights', w.id)),
  });
}

function infoForm() {
  const i = info();
  openSheet({
    title: 'Edit details',
    body: `
      <div class="field-row">${field('name', 'Name', 'text', i.name, 'required')}${field('sex', 'Sex', 'text', i.sex)}</div>
      <div class="field-row">${field('breed', 'Breed', 'text', i.breed)}${field('colour', 'Colour', 'text', i.colour)}</div>
      ${field('birthday', 'Birthday', 'date', i.birthday)}
      <div class="field-row">${field('breeder', 'From', 'text', i.breeder)}${field('breederPhone', 'Breeder phone / Zalo', 'tel', i.breederPhone)}</div>
      <h3 class="sheet-sub">Vet</h3>
      <div class="field-row">${field('vetName', 'Clinic', 'text', i.vetName)}${field('vetPhone', 'Phone', 'tel', i.vetPhone)}</div>
      ${field('vetAddress', 'Address', 'text', i.vetAddress)}
      ${textarea('notes', 'Notes (allergies, microchip…)', i.notes)}`,
    onSave: f => store.put('meta', 'info', f),
  });
}

const swReady = () => navigator.serviceWorker.ready;

async function enablePush() {
  try {
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') { toast('Notifications were not allowed'); render(); return; }
    toast('Setting up reminders…');
    const id = await store.enablePush(await swReady());
    localStorage.setItem('luta:push', id);
    toast('Reminders are on 🐾');
  } catch (err) {
    console.error(err);
    toast('Couldn’t turn on reminders: ' + (err.message || err));
  }
  render();
}

const find = (list, id) => state[list].find(x => x.id === id);

const actions = {
  'add-vaccine': () => vaccineForm({ status: 'scheduled' }),
  'edit-vaccine': id => vaccineForm(find('vaccines', id)),
  'mark-given': id => {
    const v = find('vaccines', id);
    vaccineForm({ ...v, status: 'given', date: daysUntil(v.date) > 0 ? todayISO() : v.date });
  },
  'add-deworm': () => dewormForm(),
  'edit-deworm': id => dewormForm(find('deworming', id)),
  'edit-next-deworm': nextDewormForm,
  'add-weight': () => weightForm(),
  'edit-weight': id => weightForm(find('weights', id)),
  'edit-info': infoForm,
  'add-photos': () => $('#photo-input').click(),
  'open-photo': openViewer,
  'more-photos': () => { photoLimit += PHOTO_PAGE; watchPhotos(); },
  'enable-push': enablePush,
  lock: async () => {
    if (!(await confirmSheet('Lock this phone?', 'You’ll need to type the family PIN again to open Luta. Nothing is deleted.', 'Lock'))) return;
    localStorage.removeItem('luta:space');
    localStorage.removeItem('luta:push');
    location.reload();
  },
};

document.addEventListener('click', e => {
  if (e.target.closest('#sheet-root')) return;
  const g = e.target.closest('[data-go]');
  if (g) { go(g.dataset.go); return; }
  const a = e.target.closest('[data-act]');
  if (a) actions[a.dataset.act]?.(a.dataset.id);
});
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && e.target.matches('article[data-act]')) e.target.click();
});

// ---------- start-up ----------
document.querySelectorAll('.tabbar [data-go]').forEach(b => {
  const [icon, label] = TABS[b.dataset.go];
  b.innerHTML = `${ICON[icon]}<span>${label}</span>`;
});

function showPin(message = '') {
  $('#lock-text').textContent = 'Enter your family PIN';
  $('#pin-form').hidden = false;
  $('#pin-hint').hidden = false;
  $('#pin-err').textContent = message;
  $('#pin').focus();
}

function syncError(err) {
  console.error(err);
  toast(err.code === 'permission-denied' ? 'Database rules are blocking access (see SETUP.md).' : 'Sync problem. Showing saved data.');
}

// Only the newest photos are kept in sync; "Show older photos" raises the limit.
let unwatchPhotos = null;
function watchPhotos(onFirst) {
  unwatchPhotos?.();
  unwatchPhotos = store.watchLatest('photos', 'takenAt', photoLimit, docs => {
    state.photos = docs;
    render();
    syncViewer();
    onFirst?.();
    onFirst = null;
  }, err => { syncError(err); onFirst?.(); });
}

async function start(sid) {
  $('#lock-text').textContent = 'Fetching Luta’s records…';
  await store.open(sid);
  const lists = ['vaccines', 'deworming', 'weights', 'meta'];
  await Promise.all([
    ...lists.map(name => new Promise(resolve => {
      store.watch(name, docs => {
        if (name === 'meta') { state.meta = Object.fromEntries(docs.map(d => [d.id, d])); syncViewer(); }
        else state[name] = docs;
        render();
        resolve();
      }, err => { syncError(err); resolve(); });
    })),
    new Promise(resolve => watchPhotos(resolve)),
  ]);
  ready = true;
  route = routeFromHash();
  document.body.classList.remove('locked');
  render(true);

  // Tokens can change over time, so quietly refresh this phone's push token on each launch.
  if (store.cloud && 'Notification' in window && Notification.permission === 'granted' && localStorage.getItem('luta:push')) {
    swReady().then(store.enablePush).then(id => localStorage.setItem('luta:push', id)).catch(console.warn);
  }
}

$('#pin-form').addEventListener('submit', async e => {
  e.preventDefault();
  const pin = $('#pin').value.trim();
  const btn = $('#pin-form button');
  if (pin.length < 4) { $('#pin-err').textContent = 'Use at least 4 characters.'; return; }
  btn.disabled = true;
  $('#pin-err').textContent = '';
  try {
    const sid = await store.spaceIdFromPin(pin);
    await store.open(sid);
    if (!(await store.exists())) {
      const ok = await confirmSheet('Start Luta’s tracker?',
        'No records use this PIN yet. Create a new tracker with Luta’s details?<br><br>Both phones must type <b>exactly the same PIN</b>, so if you meant to join an existing one, tap Cancel and check it.',
        'Create tracker');
      if (!ok) { btn.disabled = false; return; }
      await store.seed(SEED);
    }
    localStorage.setItem('luta:space', sid);
    $('#pin-form').hidden = true;
    $('#pin-hint').hidden = true;
    await start(sid);
  } catch (err) {
    console.error(err);
    showPin(err.code === 'permission-denied'
      ? 'The database said no. Check the Firestore rules step in SETUP.md.'
      : 'Couldn’t connect. Check your internet and try again.');
  }
  btn.disabled = false;
});

if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(console.warn);

const saved = localStorage.getItem('luta:space');
if (saved) start(saved).catch(err => { console.error(err); showPin('Couldn’t load. Please enter the PIN again.'); });
else showPin();
