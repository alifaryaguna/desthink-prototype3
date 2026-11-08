import { getAll, update, create, reset } from '../data.js';
import { currentUser, logout } from '../auth.js';
import { go } from '../router.js';
import { esc, SEVERITY } from '../util.js';

/** Read the allergen checkboxes + severity selects currently on screen. */
function readPicked(form) {
  const fd = new FormData(form);
  return fd.getAll('has').map((id) => ({ id, severity: fd.get(`sev-${id}`) }));
}

export async function render(el) {
  const [allergens, me] = await Promise.all([getAll('allergens'), currentUser()]);
  const mineMap = new Map((me.allergens ?? []).map((a) => [a.id, a.severity]));

  const standard = allergens.filter((a) => !a.custom);
  const custom = allergens.filter((a) => a.custom && a.createdBy === me.id);

  const item = (a) => {
    const sel = mineMap.get(a.id);
    // The severity control only appears once the allergen is ticked — otherwise
    // the list is ten dropdowns nobody will ever open.
    return `
      <article class="border round allergen-row ${sel ? 'on' : ''}">
        <label class="checkbox">
          <input type="checkbox" name="has" value="${esc(a.id)}" ${sel ? 'checked' : ''}>
          <span>${esc(a.name)}${a.custom ? ' <span class="tiny muted">(yours)</span>' : ''}</span>
        </label>
        <div class="field label border small top-margin severity-field">
          <select name="sev-${esc(a.id)}">
            ${Object.entries(SEVERITY).map(([k, s]) =>
              `<option value="${k}" ${sel === k ? 'selected' : ''}>${esc(s.label)}</option>`
            ).join('')}
          </select>
          <label>If I react</label>
        </div>
      </article>`;
  };

  el.innerHTML = `
    <div class="stack">
      <h1>Profile</h1>

      <form id="identity-form" class="border round stack" style="padding:var(--space-md)">
        <div class="field label border">
          <input type="text" name="name" id="p-name" maxlength="40" required placeholder=" " value="${esc(me.name)}">
          <label>Display name</label>
        </div>
        <div class="field label border">
          <input type="text" name="handle" id="p-handle" maxlength="30" required placeholder=" " value="${esc(me.handle)}">
          <label>Handle</label>
        </div>
        <div class="field textarea label border">
          <textarea name="bio" id="p-bio" maxlength="200" placeholder=" ">${esc(me.bio)}</textarea>
          <label>Bio</label>
        </div>
        <p class="tiny muted">
          Your display name and bio appear on every report you post. Neither has to be
          your real identity. Nothing else about you is shown.
        </p>
        <button class="border"><i>save</i><span>Save profile</span></button>
        <div id="id-saved" class="tiny"></div>
      </form>

      <h2>My allergens</h2>
      <p class="tiny muted">Used to decide which of other people's reports are surfaced to you first.</p>

      <form id="allergen-form" class="stack">
        ${standard.map(item).join('')}
        ${custom.length ? `<h3 class="tiny muted">Added by you</h3>${custom.map(item).join('')}` : ''}

        <article class="border round">
          <h6>Add your own</h6>
          <p class="tiny muted">
            The common allergens are listed above, but plenty of people react to things
            that aren't on anyone's standard list. Add yours.
          </p>
          <div class="field label border">
            <input type="text" id="new-allergen" maxlength="40" autocomplete="off">
            <label>Allergen or ingredient</label>
          </div>
          <button type="button" id="add-allergen" class="border">
            <i>add</i><span>Add to my list</span>
          </button>
          <div id="add-error" class="tiny"></div>
        </article>

        <button class="responsive"><i>save</i><span>Save</span></button>
        <div id="saved" class="tiny center-align"></div>
      </form>

      <h2>Demo controls</h2>
      <nav class="stack">
        <button id="logout" class="border responsive"><i>logout</i><span>Log out</span></button>
        <button id="reset" class="border responsive"><i>restart_alt</i><span>Reset all demo data</span></button>
      </nav>
    </div>
  `;

  el.querySelector('#identity-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    await update('users', me.id, {
      name: fd.get('name').trim(),
      handle: fd.get('handle').trim().toLowerCase().replace(/\s+/g, '_'),
      bio: fd.get('bio').trim()
    });
    el.querySelector('#id-saved').textContent = 'Profile saved.';
  });

  const form = el.querySelector('#allergen-form');

  form.addEventListener('change', (e) => {
    const box = e.target.closest('input[name="has"]');
    if (box) box.closest('.allergen-row').classList.toggle('on', box.checked);
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    await update('users', me.id, { allergens: readPicked(form) });
    el.querySelector('#saved').textContent = 'Saved.';
  });

  el.querySelector('#add-allergen').addEventListener('click', async () => {
    const input = el.querySelector('#new-allergen');
    const box = el.querySelector('#add-error');
    const name = input.value.trim();

    if (!name) { box.className = 'tiny error-text'; box.textContent = 'Type a name first.'; return; }
    if (allergens.some((a) => a.name.toLowerCase() === name.toLowerCase())) {
      box.className = 'tiny error-text';
      box.textContent = 'That one is already on the list.';
      return;
    }

    // Keep what's already ticked, then add the new one, already selected.
    const picked = readPicked(form);
    const created = await create('allergens', { name, icon: 'label', custom: true, createdBy: me.id });
    await update('users', me.id, { allergens: [...picked, { id: created.id, severity: 'mild' }] });
    render(el);
  });

  el.querySelector('#logout').addEventListener('click', () => {
    logout();
    go('/login');
  });

  el.querySelector('#reset').addEventListener('click', () => {
    reset();
    go('/login');
  });
}
