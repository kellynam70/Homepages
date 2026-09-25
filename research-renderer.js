import { supabase } from '../supabase-client.js';

const escapeHtml = (value = '') => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

const markdownToHtml = (value = '') => escapeHtml(value).split(/\n\s*\n/).map((block) => {
  const trimmed = block.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('### ')) return `<h3>${trimmed.slice(4)}</h3>`;
  if (trimmed.startsWith('## ')) return `<h2>${trimmed.slice(3)}</h2>`;
  if (trimmed.startsWith('# ')) return `<h2>${trimmed.slice(2)}</h2>`;
  return `<p>${trimmed.replace(/\n/g, '<br>')}</p>`;
}).join('');

const loadArticle = async () => {
  const id = new URLSearchParams(window.location.search).get('id');
  if (!id) {
    document.querySelector('[data-article-title]').textContent = '글을 찾을 수 없습니다.';
    return;
  }

  const { data, error } = await supabase.from('research').select('*').eq('id', id).single();
  if (error || !data) {
    document.querySelector('[data-article-title]').textContent = '글을 불러오지 못했습니다.';
    document.querySelector('[data-article-summary]').textContent = '잠시 후 다시 시도해 주세요.';
    return;
  }

  document.title = `${data.title || 'RESEARCH'} | 남운선`;
  document.querySelector('[data-article-meta]').textContent = `${data.category || 'RESEARCH'} · ${data.published_at || ''}`;
  document.querySelector('[data-article-title]').textContent = data.title || '제목 없음';
  document.querySelector('[data-article-summary]').textContent = data.summary || '';
  document.querySelector('[data-article-body]').innerHTML = markdownToHtml(data.content || '');
  if (data.image_url) {
    const image = document.createElement('img');
    image.src = data.image_url;
    image.alt = `${data.title || '글'} 대표 이미지`;
    document.querySelector('[data-article-image]').append(image);
  } else {
    document.querySelector('[data-article-image]').remove();
  }
};

loadArticle();
