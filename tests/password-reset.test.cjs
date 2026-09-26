const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../reset-password.js'), 'utf8')
  .replace(/^import .*;\r?\n/gm, '');
const tick = () => new Promise(resolve => setImmediate(resolve));

async function setup({ session = null, hash = '', requestError = null, updateError = null } = {}) {
  const elements = new Map();
  const element = selector => {
    if (!elements.has(selector)) elements.set(selector, {
      value: '', textContent: '', hidden: selector === '#new-password-form', dataset: {},
      handlers: {}, button: { disabled: false },
      addEventListener(name, callback) { this.handlers[name] = callback; },
      querySelector() { return this.button; },
      reset() { this.wasReset = true; },
    });
    return elements.get(selector);
  };
  const calls = { requests: [], updates: [] };
  let authCallback;
  vm.runInNewContext(source, {
    document: { querySelector: element }, URL, URLSearchParams,
    window: { location: { href: 'https://example.com/Homepages/reset-password.html', hash, search: '' } },
    supabase: { auth: {
      onAuthStateChange(callback) { authCallback = callback; },
      async getSession() { return { data: { session }, error: null }; },
      async resetPasswordForEmail(...args) { calls.requests.push(args); return { error: requestError }; },
      async updateUser(payload) { calls.updates.push(payload); return { error: updateError }; },
    } },
  });
  await tick();
  const submit = selector => element(selector).handlers.submit({ preventDefault() {} });
  return { element, calls, submit, auth: (...args) => authCallback(...args) };
}

test('request uses entered email and preserves deployment subdirectory', async () => {
  const app = await setup();
  app.element('#reset-email').value = ' admin@example.com ';
  await app.submit('#request-reset-form');
  assert.equal(app.calls.requests[0][0], 'admin@example.com');
  assert.equal(app.calls.requests[0][1].redirectTo, 'https://example.com/Homepages/reset-password.html');
  assert.match(app.element('.site-editor-status').textContent, /가입한 계정이 있다면/);
  assert.equal(app.element('#request-reset-form').button.disabled, false);
});

test('rate limiting shows an error and permits retry', async () => {
  const app = await setup({ requestError: { status: 429 } });
  await app.submit('#request-reset-form');
  assert.equal(app.element('.site-editor-status').dataset.error, 'true');
  assert.match(app.element('.site-editor-status').textContent, /잠시 후/);
  assert.equal(app.element('#request-reset-form').button.disabled, false);
});

test('no session or expired link cannot change a password', async () => {
  for (const options of [{}, { session: {}, hash: '#error=access_denied&error_code=otp_expired' }]) {
    const app = await setup(options);
    await app.submit('#new-password-form');
    assert.equal(app.calls.updates.length, 0);
    assert.equal(app.element('#new-password-form').hidden, true);
  }
});

test('recovery validates both fields and saves only after they match', async () => {
  const app = await setup();
  app.auth('PASSWORD_RECOVERY', {});
  assert.equal(app.element('#new-password-form').hidden, false);
  app.element('#new-password').value = 'short';
  await app.submit('#new-password-form');
  app.element('#new-password').value = 'example-test-password';
  app.element('#confirm-password').value = 'different';
  await app.submit('#new-password-form');
  assert.equal(app.calls.updates.length, 0);
  app.element('#confirm-password').value = 'example-test-password';
  await app.submit('#new-password-form');
  assert.equal(app.calls.updates.length, 1);
  assert.equal(app.element('#new-password-form').wasReset, true);
  assert.equal(app.element('#new-password-form').hidden, true);
  assert.equal(app.element('#reset-back').href, 'index.html');
  await app.submit('#new-password-form');
  assert.equal(app.calls.updates.length, 1);
});

test('server rejection keeps the form available; sign-out revokes it', async () => {
  const app = await setup({ session: {}, updateError: { code: 'same_password' } });
  app.element('#new-password').value = app.element('#confirm-password').value = 'example-test-password';
  await app.submit('#new-password-form');
  assert.equal(app.element('#new-password-form').hidden, false);
  assert.equal(app.element('#new-password-form').button.disabled, false);
  assert.match(app.element('.site-editor-status').textContent, /기존 비밀번호/);
  app.auth('SIGNED_OUT', null);
  await app.submit('#new-password-form');
  assert.equal(app.calls.updates.length, 1);
});
