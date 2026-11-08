import { currentUser } from '../auth.js';
import { here } from '../router.js';

const ITEMS = [
  { href: '#/',        icon: 'search',       label: 'Find' },
  { href: '#/log',     icon: 'add_circle',   label: 'Log' },
  { href: '#/history', icon: 'book',         label: 'Diary' },
  { href: '#/profile', icon: 'person',       label: 'Profile' }
];

class AppNav extends HTMLElement {
  connectedCallback() { this.refresh(); }

  async refresh() {
    const user = await currentUser();
    if (!user) { this.innerHTML = ''; return; }

    const path = here();
    const link = (i) => {
      const activeCls = path === i.href.slice(1) ? ' class="active"' : '';
      return `<a href="${i.href}"${activeCls}><i>${i.icon}</i><span>${i.label}</span></a>`;
    };

    // The brand bar belongs to the signed-in shell, so it lives here rather
    // than in index.html — on the login screen the logo is the page itself.
    this.innerHTML = `
      <header id="brand">
        <img src="img/safebites-logo.png" alt="SafeBites">
        <span class="demo-badge">Demo data</span>
      </header>
      <nav class="bottom s">${ITEMS.map(link).join('')}</nav>
      <nav class="left m l">
        ${ITEMS.map(link).join('')}
      </nav>
    `;
  }
}

customElements.define('app-nav', AppNav);
