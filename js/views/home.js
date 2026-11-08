import { getAll } from '../data.js';
import { currentUser } from '../auth.js';
import { esc, timeAgo, SEVERITY } from '../util.js';

let handler = null;

export async function render(el) {
  const [restaurants, dishes, reports, allergens, user] = await Promise.all([
    getAll('restaurants'), getAll('dishes'), getAll('reports'), getAll('allergens'), currentUser()
  ]);

  const mine = new Set((user.allergens ?? []).map((a) => a.id));
  const byRestaurant = new Map();
  for (const rep of reports) {
    const dish = dishes.find((d) => d.id === rep.dishId);
    if (!dish) continue;
    const list = byRestaurant.get(dish.restaurantId) ?? [];
    list.push(rep);
    byRestaurant.set(dish.restaurantId, list);
  }

  const card = (r) => {
    const reps = byRestaurant.get(r.id) ?? [];
    const relevant = reps.filter((rep) => rep.suspected.some((s) => mine.has(s)));
    const worst = relevant.reduce(
      (acc, rep) => (SEVERITY[rep.severity].rank > acc ? SEVERITY[rep.severity].rank : acc), 0
    );

    let line;
    if (relevant.length) {
      line = `<span class="chip sev sev-${worst === 3 ? 'severe' : worst === 2 ? 'moderate' : 'mild'}">
                <i>flag</i>${relevant.length} report${relevant.length > 1 ? 's' : ''} matching your allergens
              </span>`;
    } else if (reps.length) {
      line = `<span class="tiny muted">${reps.length} report${reps.length > 1 ? 's' : ''}, none matching your allergens</span>`;
    } else {
      line = `<span class="tiny muted"><i class="tiny">help</i> Nobody has logged anything here</span>`;
    }

    return `
      <article class="border round">
        <a href="#/restaurants/${esc(r.id)}" class="row wave">
          <div class="max">
            <h6>${esc(r.name)}</h6>
            <div class="tiny muted">${esc(r.cuisine)} · ${esc(r.city)}</div>
            <div class="top-margin">${line}</div>
          </div>
          <i>chevron_right</i>
        </a>
      </article>`;
  };

  const recent = [...reports].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3);

  el.innerHTML = `
    <div class="stack">
      <h1>Find a place</h1>

      <div class="field label prefix border round">
        <i>search</i>
        <input type="search" id="q" autocomplete="off">
        <label>Restaurant or dish</label>
      </div>

      <p class="testimony-note">
        SafeBites shows what other diners experienced. It never tells you a dish is safe —
        no amount of reports can do that. Always check with the kitchen.
      </p>

      <div id="results" class="stack">${restaurants.map(card).join('')}</div>

      <h2>Recently logged</h2>
      ${recent.map((rep) => {
        const dish = dishes.find((d) => d.id === rep.dishId);
        const rest = restaurants.find((r) => r.id === dish?.restaurantId);
        const names = allergens.filter((a) => rep.suspected.includes(a.id)).map((a) => a.name).join(', ');
        return `<article class="border round">
          <a href="#/dishes/${esc(dish?.id)}">
            <div class="tiny muted">${esc(timeAgo(rep.date))} · ${esc(rest?.name ?? '')}</div>
            <div><strong>${esc(dish?.name ?? '')}</strong> — suspected ${esc(names)}</div>
          </a>
        </article>`;
      }).join('')}
    </div>
  `;

  const results = el.querySelector('#results');
  handler = () => {
    const q = el.querySelector('#q').value.toLowerCase().trim();
    const hits = restaurants.filter((r) => {
      if (!q) return true;
      if (r.name.toLowerCase().includes(q) || r.cuisine.toLowerCase().includes(q)) return true;
      return dishes.some((d) => d.restaurantId === r.id && d.name.toLowerCase().includes(q));
    });
    results.innerHTML = hits.length
      ? hits.map(card).join('')
      : `<div class="unknown-state">
           <i>search_off</i>
           <p><strong>No match.</strong></p>
           <p class="tiny muted">Nobody has logged this place yet. You can be the first.</p>
           <a href="#/log" class="button top-margin"><i>add</i><span>Add a place</span></a>
         </div>`;
  };
  el.querySelector('#q').addEventListener('input', handler);
}

export function destroy() { handler = null; }
