import { auth, adminEmail } from './firebase-config.js';
import { signInWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js';

const form = document.querySelector('#admin-panel');
const emailInput = document.querySelector('#admin-name');
const passwordInput = document.querySelector('#admin-password');

emailInput.type = 'email';
emailInput.placeholder = 'Seu e-mail de administrador';

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const email = emailInput.value.trim().toLowerCase();
  if (email !== adminEmail) {
    alert('Este e-mail não possui acesso administrativo.');
    return;
  }
  try {
    await signInWithEmailAndPassword(auth, email, passwordInput.value);
    window.location.href = 'admin-real.html';
  } catch {
    alert('Não foi possível entrar. Confira o e-mail e a senha.');
  }
});
