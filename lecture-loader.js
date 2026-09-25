import { supabase } from './supabase-client.js';

const escapeHtml = (value = '') => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

const formatDate = (value) => {
  if (!value) return '';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
};

const renderLectures = async () => {
  const grid = document.querySelector('#lecture .lecture-grid');
  if (!grid) return;
  const { data, error } = await supabase
    .from('lecture')
    .select('id, title, organization, lecture_date, description, image_url')
    .order('lecture_date', { ascending: false });
  if (error || !data?.length) return;

  grid.innerHTML = data.map((lecture, index) => `<article class="lecture-card">
    <div class="lecture-card-media">${lecture.image_url ? `<img src="${escapeHtml(lecture.image_url)}" alt="${escapeHtml(lecture.title || '강의')} 사진">` : '<span>LECTURE</span>'}</div>
    <span class="card-number">${String(index + 1).padStart(2, '0')}</span>
    <h3>${escapeHtml(lecture.title || '')}</h3>
    <p>${escapeHtml(lecture.organization || '')} · ${escapeHtml(formatDate(lecture.lecture_date))}</p>
    <small>${escapeHtml(lecture.description || '')}</small>
  </article>`).join('');
};

renderLectures();
