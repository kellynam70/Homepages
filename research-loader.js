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

const createResearchCard = (post) => `<a class="research-card" data-id="${escapeHtml(post.id)}" href="research/article.html?id=${encodeURIComponent(post.id)}">
  <div class="research-card-media">${post.image_url ? `<img src="${escapeHtml(post.image_url)}" alt="${escapeHtml(post.title || '')} 대표 이미지">` : '<span>RESEARCH</span>'}</div>
  <span>${escapeHtml(post.category || 'RESEARCH')} · ${escapeHtml(formatDate(post.published_at))}</span>
  <h3>${escapeHtml(post.title || '제목 없음')}</h3>
  <p>${escapeHtml(post.summary || '')}</p>
  <b aria-hidden="true">↗</b>
</a>`;

const createArticleIndexItem = (post) => `<a class="article-index-item" href="article.html?id=${encodeURIComponent(post.id)}">
  <span class="article-index-meta">${escapeHtml(post.category || 'RESEARCH')} · ${escapeHtml(formatDate(post.published_at))}</span>
  <h2>${escapeHtml(post.title || '제목 없음')}</h2>
  <p>${escapeHtml(post.summary || '')}</p>
  <span class="arrow" aria-hidden="true">↗</span>
</a>`;

const renderResearch = async () => {
  const cardGrid = document.querySelector('#research .research-grid');
  const archiveList = document.querySelector('.article-index-list');
  if (!cardGrid && !archiveList) return;
  if (cardGrid) cardGrid.innerHTML = '<p class="content-empty-state">등록된 연구 글이 없습니다.</p>';
  if (archiveList) archiveList.innerHTML = '<p class="content-empty-state">등록된 연구 글이 없습니다.</p>';

  const { data, error } = await supabase.from('research').select('id, title, category, summary, image_url, published_at').order('published_at', { ascending: false }).limit(archiveList ? 100 : 4);
  if (error || !data?.length) return;
  if (cardGrid) cardGrid.innerHTML = data.slice(0, 4).map(createResearchCard).join('');
  if (archiveList) archiveList.innerHTML = data.map(createArticleIndexItem).join('');
  window.researchEntries = data.slice(0, 4);
  window.dispatchEvent(new CustomEvent('research:rendered', { detail: data.slice(0, 4) }));
};

window.reloadResearch = renderResearch;
renderResearch();
