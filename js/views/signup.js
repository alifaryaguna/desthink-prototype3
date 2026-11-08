import { signup } from '../auth.js';
import { go } from '../router.js';

export async function render(el) {
  el.innerHTML = `
    <div class="stack">
      <h1>Create an account</h1>
      <p class="muted">
        Your reports are shown publicly under your display name. Pick any name you like —
        it doesn't have to be your real one.
      </p>

      <form id="signup-form" class="stack">
        <div class="field label border">
          <input type="text" name="name" required maxlength="40">
          <label>Display name</label>
        </div>
        <div class="field label border">
          <input type="email" name="email" required autocomplete="email">
          <label>Email</label>
        </div>
        <div class="field label border">
          <input type="password" name="password" required minlength="6" autocomplete="new-password">
          <label>Password</label>
        </div>
        <div id="signup-error" class="hidden"></div>
        <button class="responsive">Create account</button>
      </form>

      <p class="center-align">Already have one? <a href="#/login">Log in</a></p>
    </div>
  `;

  el.querySelector('#signup-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const box = el.querySelector('#signup-error');
    try {
      await signup({
        name: fd.get('name'),
        email: fd.get('email'),
        password: fd.get('password')
      });
      go('/profile');
    } catch (err) {
      box.className = 'error-text';
      box.textContent = err.message;
    }
  });
}
