const articleRawBase = 'https://raw.githubusercontent.com/kellynam70/Homepages/main/';
const articleSiteBase = 'https://kellynam70.github.io/Homepages/';

const escapeArticleHtml = (value = '') => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

const parseArticleFrontMatter = (source) => {
  const match = source.match(/^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/);
  if (!match) return { data: {}, body: source.trim() };
  const data = {};
  match[1].split(/\r?\n/).forEach((line) => {
    const separator = line.indexOf(':');
    if (separator < 0) return;
    const key = line.slice(0, separator).trim();
    data[key] = line.slice(separator + 1).trim().replace(/^['"]|['"]$/g, '');
  });
  return { data, body: match[2].trim() };
};

const markdownToHtml = (markdown) => {
  const escaped = escapeArticleHtml(markdown).replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, source) => {
    const imageUrl = /^https?:\/\//i.test(source) ? source : new URL(source.replace(/^\//, ''), articleSiteBase).href;
    return `<img src="${escapeArticleHtml(imageUrl)}" alt="${alt}">`;
  });

  return escaped.split(/\n\s*\n/).map((block) => {
    const trimmed = block.trim();
    if (!trimmed) return '';
    if (trimmed.startsWith('### ')) return `<h3>${trimmed.slice(4)}</h3>`;
    if (trimmed.startsWith('## ')) return `<h2>${trimmed.slice(3)}</h2>`;
    if (trimmed.startsWith('# ')) return `<h2>${trimmed.slice(2)}</h2>`;
    if (trimmed.startsWith('<img ')) return trimmed;
    return `<p>${trimmed.replace(/\n/g, '<br>')}</p>`;
  }).join('');
};

const loadArticle = async () => {
  const path = new URLSearchParams(window.location.search).get('path');
  if (!path || !path.startsWith('content/research/') || !path.endsWith('.md')) {
    document.querySelector('[data-article-title]').textContent = '글을 찾을 수 없습니다.';
    return;
  }

  try {
    const rawUrl = `${articleRawBase}${path.split('/').map(encodeURIComponent).join('/')}`;
    const response = await fetch(rawUrl);
    if (!response.ok) throw new Error(`Article request failed: ${response.status}`);
    const { data, body } = parseArticleFrontMatter(await response.text());
    const date = data.date || '';
    document.title = `${data.title || 'RESEARCH'} | 남운선`;
    document.querySelector('[data-article-meta]').textContent = `${data.category || 'RESEARCH'} · ${date}`;
    document.querySelector('[data-article-title]').textContent = data.title || '제목 없음';
    document.querySelector('[data-article-summary]').textContent = data.summary || '';
    if (data.featured_image) {
      const image = document.createElement('img');
      image.src = /^https?:\/\//i.test(data.featured_image) ? data.featured_image : new URL(data.featured_image.replace(/^\//, ''), articleSiteBase).href;
      image.alt = `${data.title || '글'} 대표 이미지`;
      document.querySelector('[data-article-image]').append(image);
    } else {
      document.querySelector('[data-article-image]').remove();
    }
    document.querySelector('[data-article-body]').innerHTML = markdownToHtml(body);
  } catch (error) {
    document.querySelector('[data-article-title]').textContent = '글을 불러오지 못했습니다.';
    document.querySelector('[data-article-summary]').textContent = '잠시 후 다시 시도해 주세요.';
    console.error(error);
  }
};

loadArticle();
