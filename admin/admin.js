import { supabase } from '../supabase-client.js';

const state = { type: 'research', editingId: null, entries: [] };
const $ = (selector) => document.querySelector(selector);

const status = (message, isError = false) => {
  const element = $('.form-status');
  element.textContent = message;
  element.dataset.error = String(isError);
};

const formatDate = (value) => value ? String(value).slice(0, 10) : '';

const showApp = (session) => {
  $('.login-view').classList.toggle('hidden', Boolean(session));
  $('.app-view').classList.toggle('hidden', !session);
  if (session) loadEntries();
};

const uploadImage = async (file, folder) => {
  if (!file) return '';
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-');
  const path = `${folder}/${crypto.randomUUID()}-${safeName}`;
  const { error } = await supabase.storage.from('Homepage-images').upload(path, file, { upsert: false, contentType: file.type });
  if (error) throw error;
  return supabase.storage.from('Homepage-images').getPublicUrl(path).data.publicUrl;
};

const loadEntries = async () => {
  const table = state.type === 'research' ? 'research' : 'lecture';
  const orderColumn = state.type === 'research' ? 'published_at' : 'lecture_date';
  const { data, error } = await supabase.from(table).select('*').order(orderColumn, { ascending: false });
  if (error) return status(error.message, true);
  state.entries = data || [];
  $('.entry-list-items').innerHTML = state.entries.length ? state.entries.map((entry) => `<button class="entry-button" type="button" data-id="${entry.id}"><strong>${entry.title || '제목 없음'}</strong><span>${state.type === 'research' ? entry.category || '' : entry.organization || ''}</span></button>`).join('') : '<p class="empty-state">등록된 콘텐츠가 없습니다.</p>';
  $('.entry-list-items').querySelectorAll('[data-id]').forEach((button) => button.addEventListener('click', () => editEntry(button.dataset.id)));
};

const resetEditor = () => {
  state.editingId = null;
  $('.editor-form').reset();
  $('.editor-title').textContent = state.type === 'research' ? '새 RESEARCH 글' : '새 LECTURE 실적';
  $('.delete-button').classList.add('hidden');
  $('.current-image').textContent = '';
  status('');
};

const setEditorType = (type) => {
  state.type = type;
  document.querySelectorAll('[data-type]').forEach((element) => element.classList.toggle('hidden', element.dataset.type !== type));
  document.querySelectorAll('.tab-button').forEach((button) => button.classList.toggle('is-active', button.dataset.type === type));
  resetEditor();
  loadEntries();
};

const editEntry = (id) => {
  const entry = state.entries.find((item) => String(item.id) === String(id));
  if (!entry) return;
  state.editingId = entry.id;
  $('.editor-title').textContent = state.type === 'research' ? 'RESEARCH 글 수정' : 'LECTURE 실적 수정';
  if (state.type === 'research') {
    $('#research-title').value = entry.title || '';
    $('#research-category').value = entry.category || 'AI와 일자리';
    $('#research-date').value = formatDate(entry.published_at);
    $('#research-summary').value = entry.summary || '';
    $('#research-content').value = entry.content || '';
    $('.current-image').textContent = entry.image_url ? '기존 대표 이미지가 있습니다. 새 파일을 선택하면 교체됩니다.' : '';
  } else {
    $('#lecture-title').value = entry.title || '';
    $('#lecture-organization').value = entry.organization || '';
    $('#lecture-date').value = formatDate(entry.lecture_date);
    $('#lecture-description').value = entry.description || '';
    $('.current-image').textContent = entry.image_url ? '기존 강의 사진이 있습니다. 새 파일을 선택하면 교체됩니다.' : '';
  }
  $('.delete-button').classList.remove('hidden');
};

const saveEntry = async (event) => {
  event.preventDefault();
  const submitButton = $('.save-button');
  submitButton.disabled = true;
  status('저장 중입니다...');
  try {
    const table = state.type === 'research' ? 'research' : 'lecture';
    const file = state.type === 'research' ? $('#research-image').files[0] : $('#lecture-image').files[0];
    const existing = state.entries.find((item) => String(item.id) === String(state.editingId));
    const imageUrl = file ? await uploadImage(file, state.type) : existing?.image_url || null;
    const payload = state.type === 'research' ? {
      title: $('#research-title').value.trim(), category: $('#research-category').value,
      summary: $('#research-summary').value.trim(), content: $('#research-content').value.trim(),
      published_at: $('#research-date').value || new Date().toISOString().slice(0, 10), image_url: imageUrl,
    } : {
      title: $('#lecture-title').value.trim(), organization: $('#lecture-organization').value.trim(),
      lecture_date: $('#lecture-date').value, description: $('#lecture-description').value.trim(), image_url: imageUrl,
    };
    const request = state.editingId
      ? supabase.from(table).update(payload).eq('id', state.editingId)
      : supabase.from(table).insert(payload);
    const { error } = await request;
    if (error) throw error;
    status('저장했습니다.');
    resetEditor();
    await loadEntries();
  } catch (error) {
    status(error.message, true);
  } finally {
    submitButton.disabled = false;
  }
};

const deleteEntry = async () => {
  if (!state.editingId || !window.confirm('이 콘텐츠를 삭제할까요?')) return;
  const table = state.type === 'research' ? 'research' : 'lecture';
  const { error } = await supabase.from(table).delete().eq('id', state.editingId);
  if (error) return status(error.message, true);
  resetEditor();
  status('삭제했습니다.');
  await loadEntries();
};

$('#login-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  status('로그인 중입니다...');
  const { error } = await supabase.auth.signInWithPassword({ email: $('#login-email').value, password: $('#login-password').value });
  if (error) status(error.message, true);
});
$('.logout-button').addEventListener('click', () => supabase.auth.signOut());
$('.editor-form').addEventListener('submit', saveEntry);
$('.delete-button').addEventListener('click', deleteEntry);
$('.new-button').addEventListener('click', resetEditor);
document.querySelectorAll('.tab-button').forEach((button) => button.addEventListener('click', () => setEditorType(button.dataset.type)));

supabase.auth.getSession().then(({ data: { session } }) => showApp(session));
supabase.auth.onAuthStateChange((_event, session) => showApp(session));
