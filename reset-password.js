import { supabase } from './supabase-client.js';

const requestForm = document.querySelector('#request-reset-form');
const passwordForm = document.querySelector('#new-password-form');
const status = document.querySelector('.site-editor-status');
const hash = new URLSearchParams(window.location.hash.slice(1));
const linkError = hash.has('error') || new URLSearchParams(window.location.search).has('error');
let canUpdate = false;
let completed = false;

const showStatus = (message, error = false) => {
  status.textContent = message;
  status.dataset.error = String(error);
};

const showPasswordForm = () => {
  if (completed || linkError) return;
  canUpdate = true;
  requestForm.hidden = true;
  passwordForm.hidden = false;
  document.querySelector('#reset-title').textContent = '새 비밀번호 설정';
  document.querySelector('#reset-intro').textContent = '사용할 새 비밀번호를 두 번 입력해 주세요.';
  showStatus('');
};

supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'PASSWORD_RECOVERY' && session) showPasswordForm();
  if (event === 'SIGNED_OUT') {
    canUpdate = false;
    passwordForm.hidden = true;
    requestForm.hidden = false;
    showStatus('다시 재설정 메일을 요청해 주세요.');
  }
});

requestForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = requestForm.querySelector('button');
  button.disabled = true;
  showStatus('재설정 메일을 요청하고 있습니다...');
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(
      document.querySelector('#reset-email').value.trim(),
      { redirectTo: new URL('reset-password.html', window.location.href).href }
    );
    if (error) throw error;
    showStatus('이 이메일로 가입한 계정이 있다면 재설정 메일이 발송됩니다. 받은편지함과 스팸함을 확인하고, 이 컴퓨터에서 메일의 링크를 열어 주세요.');
  } catch (error) {
    showStatus(error.status === 429
      ? '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.'
      : '메일을 요청하지 못했습니다. 연결 상태를 확인하고 다시 시도해 주세요.', true);
  } finally {
    button.disabled = false;
  }
});

passwordForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!canUpdate) return showStatus('재설정 메일의 링크를 다시 열어 주세요.', true);
  const password = document.querySelector('#new-password').value;
  if (password.length < 8) return showStatus('비밀번호는 8자 이상으로 입력해 주세요.', true);
  if (password !== document.querySelector('#confirm-password').value) {
    return showStatus('두 비밀번호가 일치하지 않습니다.', true);
  }
  const button = passwordForm.querySelector('button');
  button.disabled = true;
  showStatus('새 비밀번호를 저장하고 있습니다...');
  try {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
    completed = true;
    canUpdate = false;
    passwordForm.reset();
    passwordForm.hidden = true;
    showStatus('비밀번호를 변경했습니다. 홈페이지에서 글을 관리할 수 있습니다.');
    const back = document.querySelector('#reset-back');
    back.href = 'index.html';
    back.textContent = '홈페이지로 이동';
  } catch (error) {
    showStatus(error.code === 'same_password'
      ? '기존 비밀번호와 다른 비밀번호를 입력해 주세요.'
      : '비밀번호를 저장하지 못했습니다. 더 강한 비밀번호를 입력하거나 재설정 메일을 다시 받아 주세요.', true);
  } finally {
    button.disabled = false;
  }
});

const initialize = async () => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (linkError || error) {
      showStatus('재설정 링크가 만료되었거나 유효하지 않습니다. 메일을 다시 요청해 주세요.', true);
    } else if (session) {
      showPasswordForm();
    } else {
      showStatus('');
    }
  } catch {
    showStatus('연결을 확인하지 못했습니다. 새로고침 후 다시 시도해 주세요.', true);
  }
};
initialize();
