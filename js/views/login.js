import { login } from '../auth.js';
import { consumeRedirect, go } from '../router.js';
import { getAll } from '../data.js';
import { esc } from '../util.js';

export async function render(el) {
  const users = await getAll('users');
  const demo = users.slice(0, 2);

  el.innerHTML = `
    <div class="stack">
      <h1 class="center-align"><img src="img/safebites-logo.png" alt="" class="login-logo"><span class="sr-only">SafeBites</span></h1>
      <p class="center-align muted">What other people reacted to. Not what's safe.</p>

      <form id="login-form" class="stack">
        <div class="field label border">
          <input type="email" name="email" required autocomplete="username">
          <label>Email</label>
        </div>
        <div class="field label border">
          <input type="password" name="password" required autocomplete="current-password">
          <label>Password</label>
        </div>
        <div id="login-error" class="hidden"></div>
        <button class="responsive">Log in</button>
      </form>

      <article class="border round">
        <h6>This is a prototype</h6>
        <p class="tiny">
          Every restaurant, dish and reaction report in here is invented for testing.
          None of these places exist and nobody reported any of it. Don't use anything
          you read here to decide what is safe to eat.
        </p>
      </article>

      <article class="secondary-container round">
        <h6>Demo accounts</h6>
        <ul>
          ${demo.map((u) => `<li class="tiny">${esc(u.email)} · ${esc(u.password)}</li>`).join('')}
        </ul>
      </article>

      <p class="center-align">No account? <a href="#/signup">Sign up</a></p>
    </div>
  `;

  el.querySelector('#login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const box = el.querySelector('#login-error');
    try {
      await login(fd.get('email'), fd.get('password'));
      go(consumeRedirect() ?? '/');
    } catch (err) {
      box.className = 'error-text';
      box.textContent = err.message;
    }
  });
}
