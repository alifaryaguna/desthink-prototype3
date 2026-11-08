import { get, getAll } from '../data.js';
import { currentUser } from '../auth.js';
import { esc, SEVERITY } from '../util.js';
import { go } from '../router.js';

export async function render(el, params) {
  const [restaurant, dishes, reports, user] = await Promise.all([
    get('restaurants', params.id), getAll('dishes'), getAll('reports'), currentUser()
  ]);

  if (!restaurant) { go('/'); return; }

  const mine = new Set((user.allergens ?? []).map((a) => a.id));
  const menu = dishes.filter((d) => d.restaurantId === restaurant.id);

  const row = (d) => {
    const reps = reports.filter((r) => r.dishId === d.id);
    const relevant = reps.filter((r) => r.suspected.some((s) => mine.has(s)));
    const worst = relevant.reduce((a, r) => Math.max(a, SEVERITY[r.severity].rank), 0);
    const key = worst === 3 ? 'severe' : worst === 2 ? 'moderate' : 'mild';

    const status = relevant.length
      ? `<span class="chip sev sev-${key}"><i>flag</i>${relevant.length} matching your allergens</span>`
      : reps.length
        ? `<span class="chip small">${reps.length} report${reps.length > 1 ? 's' : ''}</span>`
        : `<span class="tiny muted">No reports</span>`;

    return `
      <article class="border round">
        <a href="#/dishes/${esc(d.id)}" class="row wave">
          <div class="max">
            <h6>${esc(d.name)}</h6>
            <div class="tiny muted">${esc(d.description)}</div>
            <div class="top-margin">${status}</div>
          </div>
          <i>chevron_right</i>
        </a>
      </article>`;
  };

  el.innerHTML = `
    <div class="stack">
      <nav><a href="#/" class="button small transparent"><i>arrow_back</i><span>Back</span></a></nav>
      <h1>${esc(restaurant.name)}</h1>
      <p class="muted">${esc(restaurant.cuisine)} · ${esc(restaurant.city)}</p>

      <div class="unknown-state">
        <i>info</i>
        <p><strong>No dish here is marked safe.</strong></p>
        <p class="tiny muted">
          A dish with no reports has simply not been logged by anyone with your allergens.
          That is not the same as being free of them.
        </p>
      </div>

      <h2>Menu</h2>
      ${menu.map(row).join('')}
    </div>
  `;
}
