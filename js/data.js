const PREFIX = 'app:';
const SEEDS = ['restaurants', 'dishes', 'reports', 'users', 'allergens'];
const cache = new Map();

async function load(collection) {
  if (cache.has(collection)) return cache.get(collection);

  const stored = localStorage.getItem(PREFIX + collection);
  let rows;
  if (stored) {
    rows = JSON.parse(stored);
  } else {
    const res = await fetch(`data/${collection}.json`);
    if (!res.ok) throw new Error(`Missing seed: ${collection}`);
    rows = await res.json();
  }
  cache.set(collection, rows);
  return rows;
}

function persist(collection) {
  localStorage.setItem(PREFIX + collection, JSON.stringify(cache.get(collection)));
}

export async function getAll(collection) {
  return [...(await load(collection))];
}

export async function get(collection, id) {
  return (await load(collection)).find((r) => r.id === id) ?? null;
}

export async function create(collection, data) {
  const rows = await load(collection);
  const row = { id: crypto.randomUUID(), ...data };
  rows.push(row);
  persist(collection);
  return row;
}

export async function update(collection, id, patch) {
  const rows = await load(collection);
  const i = rows.findIndex((r) => r.id === id);
  if (i === -1) return null;
  rows[i] = { ...rows[i], ...patch };
  persist(collection);
  return rows[i];
}

export async function remove(collection, id) {
  const rows = await load(collection);
  const i = rows.findIndex((r) => r.id === id);
  if (i === -1) return false;
  rows.splice(i, 1);
  persist(collection);
  return true;
}

export function reset() {
  for (const c of SEEDS) localStorage.removeItem(PREFIX + c);
  localStorage.removeItem(PREFIX + 'session');
  cache.clear();
}
