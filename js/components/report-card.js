import { esc, severityChip, timeAgo } from '../util.js';

const CERTAINTY = {
  certain: 'They were sure of the cause',
  likely:  'They thought this was the cause',
  unsure:  'They were not sure of the cause'
};

/**
 * <app-report-card> — one person's account of one meal.
 *
 * Deliberately never states what a dish contains. It attributes everything to
 * the person who reported it. Data in via .report / .author / .allergens.
 */
class ReportCard extends HTMLElement {
  connectedCallback() { this.render(); }

  render() {
    const r = this.report;
    if (!r) return;
    const author = this.author ?? { handle: 'unknown', name: 'Unknown' };
    const names = (this.allergens ?? [])
      .filter((a) => r.suspected.includes(a.id))
      .map((a) => `<span class="chip small">${esc(a.name)}</span>`)
      .join('');

    const confirms = r.confirms?.length ?? 0;
    const confirmLine = confirms
      ? `<div class="tiny muted"><i class="tiny">group</i> ${confirms} other${confirms > 1 ? 's' : ''} reported reacting here too</div>`
      : '';

    this.innerHTML = `
      <article class="report border round">
        <div class="row-gap">
          ${severityChip(r.severity)}
          <span class="tiny muted">@${esc(author.handle)} · ${esc(timeAgo(r.date))}</span>
        </div>
        <p><strong>${esc(author.name)} reacted after eating this.</strong></p>
        <p>${esc(r.symptoms)}</p>
        <div class="chips">
          <span class="tiny muted">They suspected:</span> ${names}
        </div>
        <p class="tiny muted">${esc(CERTAINTY[r.certainty] ?? CERTAINTY.unsure)}</p>
        ${r.note ? `<p class="testimony-note">${esc(r.note)}</p>` : ''}
        ${confirmLine}
        <nav class="right-align">
          <button class="small transparent" data-confirm="${esc(r.id)}">
            <i>add</i><span>I reacted here too</span>
          </button>
        </nav>
      </article>
    `;
  }
}

customElements.define('app-report-card', ReportCard);
