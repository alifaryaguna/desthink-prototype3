import { currentUser } from './auth.js';
import { esc } from './util.js';

const routes = [
  { pattern: '/login',            view: () => import('./views/login.js') },
  { pattern: '/signup',           view: () => import('./views/signup.js') },
  { pattern: '/',                 view: () => import('./views/home.js'),       auth: true },
  { pattern: '/restaurants/:id',  view: () => import('./views/restaurant.js'), auth: true },
  { pattern: '/dishes/:id',       view: () => import('./views/dish.js'),       auth: true },
  { pattern: '/log',              view: () => import('./views/log.js'),        auth: true },
  { pattern: '/log/:dishId',      view: () => import('./views/log.js'),        auth: true },
  { pattern: '/history',          view: () => import('./views/history.js'),    auth: true },
  { pattern: '/profile',          view: () => import('./views/profile.js'),    auth: true }
];

let active = null;
let pendingRedirect = null;

/*
 * Navigation keeps hash URLs (#/dishes/d7) as the addressable form, but the
 * current path is also held in memory. Some embedded frames rewrite or drop a
 * path-shaped hash, which left every link dead; the in-memory copy means
 * navigation still works there while the URL stays correct everywhere else.
 */
let currentPath = '/';

function pathFromHash() {
  const h = location.hash.slice(1);
  return h.startsWith('/') ? h : null;
}

export function consumeRedirect() {
  const r = pendingRedirect;
  pendingRedirect = null;
  return r;
}

function match(path) {
  for (const route of routes) {
    const p = route.pattern.split('/').filter(Boolean);
    const a = path.split('/').filter(Boolean);
    if (p.length !== a.length) continue;
    const params = {};
    let ok = true;
    for (let i = 0; i < p.length; i++) {
      if (p[i].startsWith(':')) params[p[i].slice(1)] = decodeURIComponent(a[i]);
      else if (p[i] !== a[i]) { ok = false; break; }
    }
    if (ok) return { route, params };
  }
  return null;
}

async function render() {
  const found = match(currentPath);
  if (!found) { go('/'); return; }

  const user = await currentUser();
  if (found.route.auth && !user) {
    pendingRedirect = currentPath;
    go('/login');
    return;
  }
  if (!found.route.auth && user && (currentPath === '/login' || currentPath === '/signup')) {
    go('/');
    return;
  }

  if (active?.destroy) active.destroy();

  const el = document.getElementById('app');

  /*
   * Loading state. Here the data comes from localStorage and arrives in a few
   * milliseconds, so this usually flashes past — but with a real backend every
   * one of these screens waits on a network call, and a blank <main> would be
   * the most common thing a user sees on a slow connection. The delay before it
   * appears keeps it from flickering on fast transitions.
   */
  const spinner = setTimeout(() => {
    el.innerHTML = `
      <div class="loading-state">
        <progress class="circle"></progress>
        <p class="tiny muted">Loading…</p>
      </div>`;
  }, 150);

  let mod;
  try {
    mod = await found.route.view();
    active = mod;
    await mod.render(el, found.params);
  } catch (err) {
    clearTimeout(spinner);
    el.innerHTML = `
      <div class="unknown-state">
        <i>error</i>
        <p><strong>This screen didn't load.</strong></p>
        <p class="tiny muted">${esc(err.message)}</p>
        <a href="#/" class="button top-margin"><i>home</i><span>Back to search</span></a>
      </div>`;
    return;
  }
  clearTimeout(spinner);

  document.querySelector('app-nav')?.refresh?.();

  const heading = el.querySelector('h1, h2');
  if (heading) {
    heading.setAttribute('tabindex', '-1');
    heading.focus({ preventScroll: true });
    document.title = `${heading.textContent.trim()} · SafeBites`;
  }
  window.scrollTo(0, 0);
}

export function go(path) {
  if (path === currentPath) { render(); return; }
  currentPath = path;
  try { location.hash = '#' + path; } catch { /* frame may refuse the write */ }
  render();
}

export function here() { return currentPath; }

export function start() {
  currentPath = pathFromHash() ?? '/';

  window.addEventListener('hashchange', () => {
    const p = pathFromHash();
    if (p && p !== currentPath) { currentPath = p; render(); }
  });

  // Links stay plain <a href="#/…">; this keeps them working where the frame
  // will not accept a path-shaped hash.
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#/"]');
    if (!a) return;
    e.preventDefault();
    go(a.getAttribute('href').slice(1));
  });

  render();
}
