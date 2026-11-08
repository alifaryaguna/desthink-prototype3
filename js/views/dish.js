import { get, getAll, update } from '../data.js';
import { currentUser } from '../auth.js';
import { esc } from '../util.js';
import { go } from '../router.js';
import '../components/report-card.js';

let listener = null;

export async function render(el, params) {
  const [dish, restaurants, reports, users, allergens, me] = await Promise.all([
    get('dishes', params.id), getAll('restaurants'), getAll('reports'),
    getAll('users'), getAll('allergens'), currentUser()
  ]);

  if (!dish) { go('/'); return; }
  const restaurant = restaurants.find((r) => r.id === dish.restaurantId);
  const mine = new Set((me.allergens ?? []).map((a) => a.id));

  const forDish = reports
    .filter((r) => r.dishId === dish.id)
    .sort((a, b) => b.date.localeCompare(a.date));

  const relevant = forDish.filter((r) => r.suspected.some((s) => mine.has(s)));
  const other = forDish.filter((r) => !r.suspected.some((s) => mine.has(s)));

  const summary = relevant.length
    ? `<article class="secondary-container round">
         <h6>${relevant.length} ${relevant.length === 1 ? 'person has' : 'people have'} reported reacting to this dish, with allergens you also have.</h6>
         <p class="tiny">That is their experience, not a statement about the recipe. The kitchen may have changed, or the cause may have been something else entirely.</p>
       </article>`
    : `<div class="unknown-state">
         <i>help</i>
         <p><strong>Nobody with your allergens has logged this dish.</strong></p>
         <p class="tiny muted">This is the most common state in SafeBites, and the least informative. It means no data — not a clean record.</p>
       </div>`;

  el.innerHTML = `
    <div class="stack">
      <nav><a href="#/restaurants/${esc(restaurant?.id)}" class="button small transparent"><i>arrow_back</i><span>${esc(restaurant?.name ?? 'Back')}</span></a></nav>
      <h1>${esc(dish.name)}</h1>
      <p class="muted">${esc(dish.description)}</p>

      ${summary}

      <a href="#/log/${esc(dish.id)}" class="button responsive"><i>add</i><span>Log a reaction to this dish</span></a>

      ${relevant.length ? `<h2>Reports matching your allergens</h2><div id="rel"></div>` : ''}
      ${other.length ? `<h2 class="muted">Other people's reports</h2><div id="oth"></div>` : ''}
    </div>
  `;

  const mount = (sel, list) => {
    const host = el.querySelector(sel);
    if (!host) return;
    for (const r of list) {
      const card = document.createElement('app-report-card');
      card.report = r;
      card.author = users.find((u) => u.id === r.userId);
      card.allergens = allergens;
      host.appendChild(card);
    }
  };
  mount('#rel', relevant);
  mount('#oth', other);

  listener = async (e) => {
    const btn = e.target.closest('[data-confirm]');
    if (!btn) return;
    const id = btn.dataset.confirm;
    const rep = reports.find((r) => r.id === id);
    if (!rep || rep.confirms?.includes(me.id)) return;
    await update('reports', id, { confirms: [...(rep.confirms ?? []), me.id] });
    render(el, params);
  };
  el.addEventListener('click', listener);
}

export function destroy() {
  const el = document.getElementById('app');
  if (listener && el) el.removeEventListener('click', listener);
  listener = null;
}
