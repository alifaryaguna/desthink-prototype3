export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[c]));

export const SEVERITY = {
  mild:     { label: 'Mild',               icon: 'info',    rank: 1 },
  moderate: { label: 'Moderate',           icon: 'warning', rank: 2 },
  severe:   { label: 'Severe / emergency', icon: 'emergency_home', rank: 3 }
};

export function severityChip(level) {
  const s = SEVERITY[level] ?? SEVERITY.mild;
  return `<span class="chip sev sev-${esc(level)}"><i>${s.icon}</i>${esc(s.label)}</span>`;
}

export function timeAgo(iso) {
  const days = Math.floor((Date.now() - new Date(iso)) / 86400000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days} days ago`;
  const m = Math.floor(days / 30);
  return m === 1 ? '1 month ago' : `${m} months ago`;
}
