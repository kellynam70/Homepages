import { supabase } from './supabase-client.js';

const $ = (selector) => document.querySelector(selector);
const state = { session: null, type: 'research', editingId: null };

const escapeHtml = (value = '') => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

const setStatus = (message, error = false) => {
  const status = $('.site-editor-status');
  if (status) { status.textContent = message; status.dataset.error = String(error); }
};

const uploadImage = async (file, folder) => {
  if (!file) return '';
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-');
  const path = `${folder}/${crypto.randomUUID()}-${safeName}`;
  const { error } = await supabase.storage.from('Homepage-images').upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;
  return supabase.storage.from('Homepage-images').getPublicUrl(path).data.publicUrl;
};

const formatDate = (value) => value ? String(value).slice(0, 10) : '';

const showMemberTools = () => {
  document.querySelectorAll('.member-only').forEach((element) => { element.style.display = 'flex'; });
};

const addCardActions = (type, entries) => {
  if (!state.session) return;
  const selector = type === 'research' ? '#research .research-card[data-id]' : '#lecture .lecture-card[data-id]';
  document.querySelectorAll(selector).forEach((card) => {
    if (card.querySelector('.content-actions')) return;
    const actions = document.createElement('div');
    actions.className = 'content-actions';
    actions.innerHTML = '<button type="button" class="edit-content">수정</button><button type="button" class="delete-content">삭제</button>';
    actions.querySelector('.edit-content').addEventListener('click', () => openEditor(type, entries.find((entry) => String(entry.id) === card.dataset.id)));
    actions.querySelector('.delete-content').addEventListener('click', () => deleteEntry(type, card.dataset.id));
    card.append(actions);
  });
};

const openEditor = (type, entry = null) => {
  state.type = type;
  state.editingId = entry?.id || null;
  const isResearch = type === 'research';
  const title = entry ? (isResearch ? 'RESEARCH 글 수정' : 'LECTURE 강의 수정') : (isResearch ? 'RESEARCH 글쓰기' : 'LECTURE 강의 등록');
  const fields = isResearch ? `
    <label for="editor-title">제목</label><input id="editor-title" value="${escapeHtml(entry?.title || '')}" required>
    <label for="editor-category">카테고리</label><select id="editor-category"><option ${entry?.category === 'AI와 일자리' ? 'selected' : ''}>AI와 일자리</option><option ${entry?.category === '중장년의 새로운 기회' ? 'selected' : ''}>중장년의 새로운 기회</option><option ${entry?.category === '경기북부·지역정책' ? 'selected' : ''}>경기북부·지역정책</option><option ${entry?.category === '정책 아이디어' ? 'selected' : ''}>정책 아이디어</option></select>
    <label for="editor-date">작성일</label><input id="editor-date" type="date" value="${formatDate(entry?.published_at)}" required>
    <label for="editor-image">대표사진</label><input id="editor-image" type="file" accept="image/*"><small class="image-note">${entry?.image_url ? '기존 이미지가 있습니다. 새 파일 선택 시 교체됩니다.' : ''}</small>
    <label for="editor-summary">짧은 요약</label><textarea id="editor-summary" required>${escapeHtml(entry?.summary || '')}</textarea>
    <label for="editor-content">본문</label><textarea id="editor-content" required>${escapeHtml(entry?.content || '')}</textarea>` : `
    <label for="editor-title">강의 제목</label><input id="editor-title" value="${escapeHtml(entry?.title || '')}" required>
    <label for="editor-organization">기관</label><input id="editor-organization" value="${escapeHtml(entry?.organization || '')}" required>
    <label for="editor-date">날짜</label><input id="editor-date" type="date" value="${formatDate(entry?.lecture_date)}" required>
    <label for="editor-image">강의 사진</label><input id="editor-image" type="file" accept="image/*"><small class="image-note">${entry?.image_url ? '기존 이미지가 있습니다. 새 파일 선택 시 교체됩니다.' : ''}</small>
    <label for="editor-description">짧은 설명</label><textarea id="editor-description">${escapeHtml(entry?.description || '')}</textarea>`;

  const overlay = document.createElement('div');
  overlay.className = 'site-editor-overlay';
  overlay.innerHTML = `<section class="site-editor-modal" role="dialog" aria-modal="true" aria-labelledby="editor-modal-title"><form class="site-editor-form" id="content-editor-form"><button class="modal-close" type="button" aria-label="닫기">×</button><h2 id="editor-modal-title">${title}</h2>${fields}<div class="modal-actions"><button class="editor-primary" type="submit">${entry ? '수정 저장' : isResearch ? '게시하기' : '등록'}</button><button class="editor-secondary modal-cancel" type="button">취소</button></div><p class="site-editor-status" aria-live="polite"></p></form></section>`;
  document.body.append(overlay);
  overlay.querySelector('.modal-close').addEventListener('click', () => overlay.remove());
  overlay.querySelector('.modal-cancel').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (event) => { if (event.target === overlay) overlay.remove(); });
  overlay.querySelector('form').addEventListener('submit', (event) => saveEntry(event, overlay, type, entry));
};

const saveEntry = async (event, overlay, type, entry) => {
  event.preventDefault();
  const form = overlay.querySelector('form');
  const status = overlay.querySelector('.site-editor-status');
  const button = form.querySelector('.editor-primary');
  button.disabled = true;
  status.textContent = '저장 중입니다...';
  try {
    const file = form.querySelector('#editor-image').files[0];
    const imageUrl = file ? await uploadImage(file, type) : entry?.image_url || null;
    const payload = type === 'research' ? {
      title: form.querySelector('#editor-title').value.trim(), category: form.querySelector('#editor-category').value,
      published_at: form.querySelector('#editor-date').value, image_url: imageUrl,
      summary: form.querySelector('#editor-summary').value.trim(), content: form.querySelector('#editor-content').value.trim(),
    } : {
      title: form.querySelector('#editor-title').value.trim(), organization: form.querySelector('#editor-organization').value.trim(),
      lecture_date: form.querySelector('#editor-date').value, image_url: imageUrl,
      description: form.querySelector('#editor-description').value.trim(),
    };
    const request = entry ? supabase.from(type).update(payload).eq('id', entry.id) : supabase.from(type).insert(payload);
    const { error } = await request;
    if (error) throw error;
    overlay.remove();
    setStatus('저장했습니다.');
    if (type === 'research') window.reloadResearch?.();
    if (type === 'lecture') window.reloadLectures?.();
  } catch (error) {
    status.textContent = error.message;
    status.dataset.error = 'true';
    button.disabled = false;
  }
};

const deleteEntry = async (type, id) => {
  if (!window.confirm('이 콘텐츠를 삭제할까요?')) return;
  const { error } = await supabase.from(type).delete().eq('id', id);
  if (error) return setStatus(error.message, true);
  setStatus('삭제했습니다.');
  if (type === 'research') window.reloadResearch?.();
  if (type === 'lecture') window.reloadLectures?.();
};

const addTools = () => {
  if (!state.session) return;
  document.querySelectorAll('.member-only').forEach((element) => { element.style.display = 'flex'; });
  if (window.researchEntries) addCardActions('research', window.researchEntries);
  if (window.lectureEntries) addCardActions('lecture', window.lectureEntries);
  document.querySelectorAll('[data-logout]').forEach((button) => {
    button.onclick = () => supabase.auth.signOut();
  });
  document.querySelectorAll('.member-tools button[data-editor-type]').forEach((button) => {
    button.onclick = () => openEditor(button.dataset.editorType);
  });
};

window.addEventListener('research:rendered', (event) => addCardActions('research', event.detail));
window.addEventListener('lecture:rendered', (event) => addCardActions('lecture', event.detail));

supabase.auth.getSession().then(({ data: { session } }) => { state.session = session; addTools(); });
supabase.auth.onAuthStateChange((_event, session) => {
  state.session = session;
  if (session) addTools();
  else document.querySelectorAll('.member-only').forEach((element) => { element.style.display = 'none'; });
});
