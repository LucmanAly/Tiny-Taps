// Parent voice recordings, stored as blobs in IndexedDB so they survive
// restarts and work offline. Keys are categories ('praise', 'encourage').

const DB_NAME = 'tinytaps';
const STORE = 'recordings';

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) {
        req.result.createObjectStore(STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx(db, mode, fn) {
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const store = t.objectStore(STORE);
    const req = fn(store);
    t.oncomplete = () => resolve(req && req.result);
    t.onerror = () => reject(t.error);
  });
}

export async function save(key, blob) {
  const db = await openDb();
  await tx(db, 'readwrite', s => s.put(blob, key));
}

export async function remove(key) {
  const db = await openDb();
  await tx(db, 'readwrite', s => s.delete(key));
}

export async function loadAll() {
  const db = await openDb();
  const map = new Map();
  await new Promise((resolve, reject) => {
    const t = db.transaction(STORE, 'readonly');
    const req = t.objectStore(STORE).openCursor();
    req.onsuccess = () => {
      const cur = req.result;
      if (cur) { map.set(cur.key, cur.value); cur.continue(); }
      else resolve();
    };
    req.onerror = () => reject(req.error);
  });
  return map;
}
