import { supabase } from './supabase-client.js';

const form = document.querySelector('#site-login-form');
const status = document.querySelector('.site-editor-status');

const showStatus = (message, isError = false) => {
  status.textContent = message;
  status.dataset.error = String(isError);
};

const redirectIfSignedIn = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) window.location.replace('index.html');
};

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  showStatus('로그인 중입니다...');
  const { error } = await supabase.auth.signInWithPassword({
    email: document.querySelector('#site-login-email').value,
    password: document.querySelector('#site-login-password').value,
  });
  if (error) return showStatus(error.message, true);
  window.location.replace('index.html');
});

redirectIfSignedIn();
