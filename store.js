// Data layer. Uses Firestore when firebase-config.js is filled in,
// otherwise falls back to this device's localStorage ("demo mode").
import { firebaseConfig, vapidKey } from './firebase-config.js';

const FB = 'https://www.gstatic.com/firebasejs/10.14.1';

export const cloud = Boolean(firebaseConfig.apiKey) && !firebaseConfig.apiKey.startsWith('PASTE');

async function sha256(text) {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2, '0')).join('');
}

// Both phones type the same PIN, so both arrive at the same private folder in the database.
export const spaceIdFromPin = pin => sha256('luta-tracker:' + pin.trim().toLowerCase());

// ---------- Firestore ----------
let fb = null;
let sid = null;

async function firebase() {
  if (fb) return fb;
  const [appMod, fs] = await Promise.all([
    import(`${FB}/firebase-app.js`),
    import(`${FB}/firebase-firestore.js`),
  ]);
  const app = appMod.initializeApp(firebaseConfig);
  let db;
  try {
    db = fs.initializeFirestore(app, {
      localCache: fs.persistentLocalCache({ tabManager: fs.persistentMultipleTabManager() }),
    });
  } catch {
    db = fs.getFirestore(app);
  }
  return (fb = { app, fs, db });
}

const col = name => fb.fs.collection(fb.db, 'spaces', sid, name);
const ref = (name, id) => fb.fs.doc(fb.db, 'spaces', sid, name, id);

const remote = {
  async open(id) { sid = id; await firebase(); },
  async exists() {
    try {
      return (await fb.fs.getDocFromServer(ref('meta', 'info'))).exists();
    } catch (err) {
      if (err.code !== 'unavailable') throw err;
      return (await fb.fs.getDoc(ref('meta', 'info'))).exists();
    }
  },
  watch(name, cb, onErr) {
    return fb.fs.onSnapshot(col(name), snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))), onErr);
  },
  watchLatest(name, field, n, cb, onErr) {
    const q = fb.fs.query(col(name), fb.fs.orderBy(field, 'desc'), fb.fs.limit(n));
    return fb.fs.onSnapshot(q, snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))), onErr);
  },
  async get(name, id) {
    const s = await fb.fs.getDoc(ref(name, id));
    return s.exists() ? { id: s.id, ...s.data() } : null;
  },
  newId: () => fb.fs.doc(col('photos')).id,
  add: (name, data) => fb.fs.addDoc(col(name), data),
  put: (name, id, data) => fb.fs.setDoc(ref(name, id), data, { merge: true }),
  del: (name, id) => fb.fs.deleteDoc(ref(name, id)),
  bump: (name, id, deltas) => fb.fs.setDoc(ref(name, id),
    Object.fromEntries(Object.entries(deltas).map(([k, v]) => [k, fb.fs.increment(v)])), { merge: true }),
};

// ---------- localStorage (demo mode) ----------
const local = {
  key: null, data: {}, subs: {},
  async open(id) {
    this.key = 'luta:local:' + id;
    try { this.data = JSON.parse(localStorage.getItem(this.key)) || {}; } catch { this.data = {}; }
  },
  async exists() { return Boolean(this.data.meta?.info); },
  list(name) { return Object.entries(this.data[name] || {}).map(([id, v]) => ({ id, ...v })); },
  emit(name) {
    // Photos are too big for localStorage, so in demo mode they only last until a reload.
    const { photos, photoData, ...rest } = this.data;
    try { localStorage.setItem(this.key, JSON.stringify(rest)); } catch {}
    (this.subs[name] || []).forEach(cb => cb(this.list(name)));
  },
  watch(name, cb) {
    const subs = (this.subs[name] ||= []);
    subs.push(cb);
    cb(this.list(name));
    return () => { const i = subs.indexOf(cb); if (i >= 0) subs.splice(i, 1); };
  },
  watchLatest(name, field, n, cb) {
    return this.watch(name, docs => cb(docs.sort((a, b) => String(b[field]).localeCompare(String(a[field]))).slice(0, n)));
  },
  async get(name, id) { const v = this.data[name]?.[id]; return v ? { id, ...v } : null; },
  newId: () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
  async add(name, data) {
    (this.data[name] ||= {})[this.newId()] = data;
    this.emit(name);
  },
  async bump(name, id, deltas) {
    const c = (this.data[name] ||= {});
    const cur = c[id] || {};
    c[id] = { ...cur, ...Object.fromEntries(Object.entries(deltas).map(([k, v]) => [k, (cur[k] || 0) + v])) };
    this.emit(name);
  },
  async put(name, id, data) {
    const c = (this.data[name] ||= {});
    c[id] = { ...c[id], ...data };
    this.emit(name);
  },
  async del(name, id) { delete this.data[name]?.[id]; this.emit(name); },
};

const backend = cloud ? remote : local;

export const open = id => backend.open(id);
export const exists = () => backend.exists();
export const watch = (name, cb, onErr) => backend.watch(name, cb, onErr);
export const watchLatest = (name, field, n, cb, onErr) => backend.watchLatest(name, field, n, cb, onErr);
export const get = (name, id) => backend.get(name, id);
export const newId = () => backend.newId();
export const bump = (name, id, deltas) => backend.bump(name, id, deltas);
export const add = (name, data) => backend.add(name, data);
export const put = (name, id, data) => backend.put(name, id, data);
export const del = (name, id) => backend.del(name, id);

export async function seed({ info, settings, vaccines }) {
  await Promise.all([
    backend.put('meta', 'info', info),
    backend.put('meta', 'settings', settings),
    ...vaccines.map(v => backend.add('vaccines', v)),
  ]);
}

// Registers this phone for reminder pushes. Call after Notification permission is granted.
export async function enablePush(registration) {
  const m = await import(`${FB}/firebase-messaging.js`);
  if (!(await m.isSupported())) throw new Error('This browser cannot receive push notifications.');
  const token = await m.getToken(m.getMessaging(fb.app), { vapidKey, serviceWorkerRegistration: registration });
  const id = (await sha256(token)).slice(0, 32);
  await backend.put('tokens', id, { token, updatedAt: new Date().toISOString() });
  return id;
}
