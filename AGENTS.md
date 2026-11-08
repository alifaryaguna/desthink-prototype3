# AGENTS.md

Clickable prototype, built as a single-page application (SPA): one `index.html`, views rendered client-side via the router. Fake what isn't needed to demo the flow; keep the code simple.

## Stack (hard constraints)
- HTML, CSS, vanilla JS (ES modules). No frameworks, no TypeScript, no build step.
- Libraries: only after explicit approval from the user. Ask first, stating name, purpose and why vanilla JS isn't enough. Load approved libraries from a CDN with a pinned version (no npm, no bundler).
- UI: **beer.css only**. Load from CDN with a pinned version in `index.html`. Do not add other CSS/UI libraries.
- Icons: Material Symbols (bundled with beer.css), `<i>icon_name</i>`.
- Webfonts: Google Fonts `<link>` is permitted for the brand typefaces (Racing Sans One, Host Grotesk). Fonts are not a UI library; no other external stylesheets.
- Frontend only: no server-side code, no APIs, no databases. Serve the folder with any static server (`fetch()` does not work on `file://`).

## Structure
```
index.html          # single entry, app shell (nav + <main id="app">)
css/tokens.css      # brand tokens bound to beer.css variables (the only place hex lives)
css/app.css         # overrides only; keep minimal
js/app.js           # bootstrap: start router
js/router.js        # hash router + auth guard
js/data.js          # JSON seed + localStorage persistence
js/auth.js          # fake login/signup/session
js/views/*.js       # one module per route
js/components/*.js  # reusable light-DOM web components (only when needed)
data/*.json         # seed content (read-only)
data/users.json     # demo accounts
```

## beer.css rules
- Use beer.css components and helpers (`nav`, `article`, `dialog`, `field label border`, `button`, `chip`, `grid`, `s12 m6 l4`, `responsive`, etc.) before writing any CSS.
- **No raw hex outside `css/tokens.css`.** Brand colors enter the app only by rebinding beer.css's Material 3 custom properties in that one file. Views, components and `app.css` use the tokens (`--primary`, `--surface`, …) or beer.css helper classes — never a literal color.
- **Bind brand colors to M3 roles by function, not by name.** The stylesheet's names and beer.css's roles do not line up: the brand's *tertiary* orange is the loud interactive color and maps to `--primary`; the brand's *primary* navy is structure and text and maps to surface/`on-` roles. Mapping name-to-name would make every default button sky blue.
- Do **not** call `ui("theme", …)` for brand color. It generates its own tonal ramp from a seed and will not reproduce the specified values. Light/dark switching via `ui("mode", …)` is fine.
- `app.css` is for layout gaps beer.css doesn't cover. No inline styles.
- Semantic HTML first; beer.css styles native elements.

## Design tokens
- Source of truth is the SafeBites stylesheet. `css/tokens.css` is its only implementation.
- Spacing and radius scales may be extended beyond the documented `sm`/`md` when a screen needs it, but only by adding a named step to `tokens.css` (`--space-lg`, `--round-lg`, …). No one-off pixel values in views.
- Contrast rules, decided once so they aren't re-litigated per screen:
  - Navy on neutral (17.6:1) and navy on sky (13.8:1) — unrestricted.
  - Navy on orange (4.8:1) — passes AA; **this is the default for text and labels on orange fills.**
  - White on orange (4.0:1) and orange on neutral (3.7:1) — large text (24px+, or 19px bold), icons and non-text graphics only. Never body copy.

## Typography
- `Racing Sans One` — wordmark and display only. Never UI text.
- `Host Grotesk` — everything else. Extra Bold = h1, Semi Bold = h2 / card headers, Regular = body.
- Bound via `--font` in `tokens.css` so beer.css components inherit it.

## Routing
- Hash-based (`#/`, `#/items/42`). Works on any static host without server rewrites.
- `router.js`: route table `{ pattern: '/items/:id', view: () => import('./views/item.js'), auth: true }`, listens to `hashchange` + initial load, parses params, renders into `#app`.
- `auth: true` routes redirect to `#/login` when there is no session, then return to the original route after login.
- Each view exports `async render(el, params)` and optional `destroy()`.
- Unknown route → `#/` (or a not-found view).
- Navigation = plain `<a href="#/…">`. No `history.pushState`.
- After render: move focus to the view heading, update `document.title`.

## Web components
- Only for UI reused across views (e.g. `<app-nav>`, `<item-card>`). One-off markup stays in the view.
- Light DOM only: no Shadow DOM, no `attachShadow`, so beer.css styles apply.
- One component per file, tag prefix `app-`, `customElements.define` at the bottom of the file; views import what they use.
- Render in `connectedCallback`, clean up in `disconnectedCallback`. Input via attributes or properties, output via `CustomEvent`s.
- Components get data from their parent, not from `data.js` directly.

## Data
- `data/*.json` is seed data, never written to.
- `data.js` is the only data access point; views never call `fetch` or `localStorage` directly.
- API: `getAll(collection)`, `get(collection, id)`, `create`, `update`, `remove`, `reset()`.
- Persistence: on first write a collection is copied from its JSON seed into `localStorage` (key `app:<collection>`); from then on `localStorage` is the source of truth for that collection.
- New ids via `crypto.randomUUID()`.
- `reset()` clears all `app:*` keys → back to seed state. Expose it in the UI (e.g. settings or footer) for demos.
- No hardcoded content in JS or HTML.

## Auth (fake)
- No real authentication, hashing or security. Prototype only.
- Users = `data/users.json` (demo accounts) + signups, both via `data.js` collection `users`.
- `auth.js`: `signup({name, email, password})`, `login(email, password)`, `logout()`, `currentUser()`.
- Login = match email + password against the users collection. Signup = validate required fields + unique email, create user, log in.
- Session = `localStorage` key `app:session` holding the user id.
- Show demo credentials on the login screen.

## Code style
- ES modules, `const`/`let`, `async/await`. Small pure functions.
- Build DOM with template literals + `textContent` for data; escape anything inserted via `innerHTML`.
- Event delegation on `#app`; clean up listeners in `destroy()`.
- No global state except a single exported `state` object in `app.js` if needed.
- Forms: native validation (`required`, `type="email"`) + beer.css field error states.

## Don'ts
- Don't invent beer.css classes; check the beer.css docs when unsure.
- Don't write a hex value anywhere except `css/tokens.css`.
