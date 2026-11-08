import { getAll, create, get } from './data.js';

const SESSION = 'app:session';

export async function currentUser() {
  const id = localStorage.getItem(SESSION);
  return id ? await get('users', id) : null;
}

export async function login(email, password) {
  const users = await getAll('users');
  const user = users.find(
    (u) => u.email.toLowerCase() === String(email).toLowerCase().trim() && u.password === password
  );
  if (!user) throw new Error('No account matches that email and password.');
  localStorage.setItem(SESSION, user.id);
  return user;
}

export async function signup({ name, email, password, handle }) {
  const users = await getAll('users');
  const clean = String(email).toLowerCase().trim();
  if (users.some((u) => u.email.toLowerCase() === clean)) {
    throw new Error('An account with that email already exists.');
  }
  const user = await create('users', {
    name: name.trim(),
    handle: (handle || name).trim().toLowerCase().replace(/\s+/g, '_'),
    email: clean,
    password,
    bio: '',
    allergens: []
  });
  localStorage.setItem(SESSION, user.id);
  return user;
}

export function logout() {
  localStorage.removeItem(SESSION);
}
