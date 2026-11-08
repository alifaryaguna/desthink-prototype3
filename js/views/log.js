import { get, getAll, create } from '../data.js';
import { currentUser } from '../auth.js';
import { esc, SEVERITY } from '../util.js';
import { go } from '../router.js';

export async function render(el, params) {
  const [restaurants, dishes, allergens, me] = await Promise.all([
    getAll('restaurants'), getAll('dishes'), getAll('allergens'), currentUser()
  ]);

  const preset = params.dishId ? await get('dishes', params.dishId) : null;
  const myAllergenIds = (me.allergens ?? []).map((a) => a.id);

  const dishOptions = (restaurantId) => dishes
    .filter((d) => d.restaurantId === restaurantId)
    .map((d) => `<option value="${esc(d.id)}" ${preset?.id === d.id ? 'selected' : ''}>${esc(d.name)}</option>`)
    .join('');

  el.innerHTML = `
    <div class="stack">
      <h1>Log a reaction</h1>
      <p class="muted">
        Describe what happened to you. Don't state what the dish contains —
        you can say what you suspect, and others will read it as a suspicion.
      </p>

      <form id="log-form" class="stack">
        <div class="field label border">
          <select name="restaurant" id="restaurant" required>
            <option value="" disabled ${preset ? '' : 'selected'}></option>
            ${restaurants.map((r) =>
              `<option value="${esc(r.id)}" ${preset?.restaurantId === r.id ? 'selected' : ''}>${esc(r.name)} · ${esc(r.city)}</option>`
            ).join('')}
            <option value="__new">+ Add a place that isn't listed</option>
          </select>
          <label>Restaurant</label>
        </div>

        <div id="new-restaurant" class="stack" hidden>
          <div class="field label border">
            <input type="text" name="newRestaurantName" id="nr-name" maxlength="60" autocomplete="off">
            <label>Restaurant name</label>
          </div>
          <div class="field label border">
            <input type="text" name="newRestaurantCity" id="nr-city" maxlength="40" autocomplete="off">
            <label>Town or city</label>
          </div>
          <p class="tiny muted">Everyone will see this place once you post, so name it the way it appears on the door.</p>
        </div>

        <div class="field label border">
          <select name="dish" id="dish" required>
            ${preset ? dishOptions(preset.restaurantId) : '<option value="" disabled selected></option>'}
          </select>
          <label>Dish</label>
        </div>

        <div id="new-dish" class="stack" hidden>
          <div class="field label border">
            <input type="text" name="newDishName" id="nd-name" maxlength="60" autocomplete="off">
            <label>Dish name</label>
          </div>
          <div class="field label border">
            <input type="text" name="newDishDescription" id="nd-desc" maxlength="120" autocomplete="off">
            <label>How it's described on the menu (optional)</label>
          </div>
        </div>

        <h6>What do you suspect caused it?</h6>
        <div class="chips" id="allergen-chips">
          ${allergens.map((a) => `
            <label class="chip ${myAllergenIds.includes(a.id) ? 'fill' : ''}">
              <input type="checkbox" name="suspected" value="${esc(a.id)}">
              <span>${esc(a.name)}</span>
            </label>`).join('')}
        </div>
        <p class="tiny muted">Your own allergens are highlighted. You can pick any.</p>

        <div class="row-gap">
          <div class="field label border max">
            <input type="text" id="new-suspect" maxlength="40" autocomplete="off">
            <label>Something not listed?</label>
          </div>
          <button type="button" id="add-suspect" class="border"><i>add</i><span>Add</span></button>
        </div>
        <div id="suspect-error" class="tiny"></div>

        <h6>How bad was it?</h6>
        <div class="stack">
          ${Object.entries(SEVERITY).map(([key, s]) => `
            <label class="radio">
              <input type="radio" name="severity" value="${esc(key)}" ${key === 'mild' ? 'checked' : ''}>
              <span><i>${s.icon}</i> ${esc(s.label)}</span>
            </label>`).join('')}
        </div>

        <div class="field textarea label border">
          <textarea name="symptoms" required maxlength="200"></textarea>
          <label>What happened to you?</label>
        </div>

        <div class="field textarea label border">
          <textarea name="note" maxlength="300"></textarea>
          <label>Anything else others should know? (optional)</label>
        </div>

        <h6>How sure are you of the cause?</h6>
        <div class="field label border">
          <select name="certainty" required>
            <option value="unsure" selected>Not sure</option>
            <option value="likely">Fairly sure</option>
            <option value="certain">Certain, confirmed</option>
          </select>
          <label>Certainty</label>
        </div>
        <p class="tiny muted">
          "Certain" means you confirmed it with the kitchen or a doctor — not that you
          feel sure. Others read this to weigh your report.
        </p>

        <div id="log-error" class="hidden"></div>
        <button class="responsive"><i>check</i><span>Post report</span></button>
      </form>
    </div>
  `;

  const restSel = el.querySelector('#restaurant');
  const dishSel = el.querySelector('#dish');
  const newRest = el.querySelector('#new-restaurant');
  const newDish = el.querySelector('#new-dish');

  const ADD = '__new';
  const dishPlaceholder = `<option value="" disabled selected></option><option value="${ADD}">+ Add a dish that isn't listed</option>`;

  function syncDishField() {
    newDish.hidden = dishSel.value !== ADD;
    el.querySelector('#nd-name').required = dishSel.value === ADD;
  }

  restSel.addEventListener('change', () => {
    const adding = restSel.value === ADD;
    newRest.hidden = !adding;
    el.querySelector('#nr-name').required = adding;
    el.querySelector('#nr-city').required = adding;

    // A brand-new place has no menu, so the dish has to be new too.
    dishSel.innerHTML = adding
      ? `<option value="${ADD}" selected>+ Add a dish</option>`
      : dishOptions(restSel.value) + `<option value="${ADD}">+ Add a dish that isn't listed</option>`;
    syncDishField();
  });

  dishSel.addEventListener('change', syncDishField);

  if (!preset) dishSel.innerHTML = dishPlaceholder;
  syncDishField();

  // Add an allergen that isn't on the standard list, without losing the rest
  // of the half-filled form.
  el.querySelector('#add-suspect').addEventListener('click', async () => {
    const input = el.querySelector('#new-suspect');
    const box = el.querySelector('#suspect-error');
    const name = input.value.trim();

    if (!name) { box.className = 'tiny error-text'; box.textContent = 'Type a name first.'; return; }

    const existing = allergens.find((a) => a.name.toLowerCase() === name.toLowerCase());
    let id;
    if (existing) {
      id = existing.id;
    } else {
      const created = await create('allergens', { name, icon: 'label', custom: true, createdBy: me.id });
      allergens.push(created);
      id = created.id;
    }

    if (el.querySelector(`input[name="suspected"][value="${CSS.escape(id)}"]`)) {
      box.className = 'tiny muted';
      box.textContent = 'Already in the list — tick it above.';
      input.value = '';
      return;
    }

    const label = document.createElement('label');
    label.className = 'chip fill';
    label.innerHTML = `<input type="checkbox" name="suspected" value="${esc(id)}" checked><span>${esc(name)}</span>`;
    el.querySelector('#allergen-chips').appendChild(label);

    input.value = '';
    box.className = 'tiny muted';
    box.textContent = `Added "${name}" and selected it.`;
  });

  el.querySelector('#log-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const suspected = fd.getAll('suspected');
    const box = el.querySelector('#log-error');

    if (!suspected.length) {
      box.className = 'error-text';
      box.textContent = 'Pick at least one suspected allergen.';
      return;
    }

    // A place or dish the user typed in gets created before the report that
    // points at it, so the report always references a real record.
    let restaurantId = fd.get('restaurant');
    if (restaurantId === '__new') {
      const created = await create('restaurants', {
        name: fd.get('newRestaurantName').trim(),
        city: fd.get('newRestaurantCity').trim(),
        cuisine: 'Added by a diner',
        addedBy: me.id
      });
      restaurantId = created.id;
    }

    let dishId = fd.get('dish');
    if (dishId === '__new') {
      const created = await create('dishes', {
        restaurantId,
        name: fd.get('newDishName').trim(),
        description: fd.get('newDishDescription').trim(),
        addedBy: me.id
      });
      dishId = created.id;
    }

    await create('reports', {
      dishId,
      userId: me.id,
      suspected,
      severity: fd.get('severity'),
      symptoms: fd.get('symptoms').trim(),
      note: fd.get('note').trim(),
      certainty: fd.get('certainty'),
      date: new Date().toISOString().slice(0, 10),
      confirms: []
    });

    go(`/dishes/${dishId}`);
  });
}
