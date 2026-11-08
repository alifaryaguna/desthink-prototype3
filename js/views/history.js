import { getAll } from '../data.js';
import { currentUser } from '../auth.js';
import { esc, severityChip, timeAgo } from '../util.js';

export async function render(el) {
  const [reports, dishes, restaurants, allergens, me] = await Promise.all([
    getAll('reports'), getAll('dishes'), getAll('restaurants'), getAll('allergens'), currentUser()
  ]);

  const mine = reports
    .filter((r) => r.userId === me.id)
    .sort((a, b) => b.date.localeCompare(a.date));

  // Which allergens show up most often in this person's own history.
  const tally = new Map();
  for (const r of mine) for (const s of r.suspected) tally.set(s, (tally.get(s) ?? 0) + 1);
  const ranked = [...tally.entries()].sort((a, b) => b[1] - a[1]);

  const pattern = ranked.length
    ? `<article class="secondary-container round">
         <h6>Your own pattern</h6>
         <p class="tiny">Across ${mine.length} entr${mine.length > 1 ? 'ies' : 'y'}, these come up most:</p>
         <div class="chips">
           ${ranked.map(([id, n]) => {
             const a = allergens.find((x) => x.id === id);
             return `<span class="chip small"><i>${esc(a?.icon ?? 'help')}</i>${esc(a?.name ?? id)} · ${n}×</span>`;
           }).join('')}
         </div>
         <p class="tiny muted top-margin">A count, not a diagnosis. Take it to an allergist, not as one.</p>
       </article>`
    : '';

  el.innerHTML = `
    <div class="stack">
      <h1>My diary</h1>
      ${pattern}
      ${mine.length ? mine.map((r) => {
        const dish = dishes.find((d) => d.id === r.dishId);
        const rest = restaurants.find((x) => x.id === dish?.restaurantId);
        return `
          <article class="border round">
            <a href="#/dishes/${esc(dish?.id)}">
              <div class="row-gap">${severityChip(r.severity)}<span class="tiny muted">${esc(timeAgo(r.date))}</span></div>
              <h6>${esc(dish?.name ?? 'Unknown dish')}</h6>
              <div class="tiny muted">${esc(rest?.name ?? '')}</div>
              <p class="tiny">${esc(r.symptoms)}</p>
            </a>
          </article>`;
      }).join('') : `
        <div class="unknown-state">
          <i>edit_note</i>
          <p><strong>You haven't logged anything yet.</strong></p>
          <p class="tiny muted">Logging is useful even when the cause is obvious — it's how you remember how badly you reacted last time.</p>
          <a href="#/log" class="button top-margin"><i>add</i><span>Log a reaction</span></a>
        </div>`}
    </div>
  `;
}
