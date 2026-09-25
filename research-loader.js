const researchApiUrl = 'https://api.github.com/repos/kellynam70/Homepages/contents/content/research?ref=main';
const researchRawBase = 'https://raw.githubusercontent.com/kellynam70/Homepages/main/';
const siteBase = 'https://kellynam70.github.io/Homepages/';

const escapeHtml = (value = '') => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

const parseFrontMatter = (source) => {
  const match = source.match(/^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/);
  if (!match) return { data: {}, body: source.trim() };

  const data = {};
  match[1].split(/\r?\n/).forEach((line) => {
    const separator = line.indexOf(':');
    if (separator < 0) return;
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim().replace(/^['"]|['"]$/g, '');
    data[key] = value;
  });

  return { data, body: match[2].trim() };
};

const toSiteUrl = (value) => {
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  return new URL(value.replace(/^\//, ''), siteBase).href;
};

const formatDate = (value) => {
  if (!value) return '';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
};

const fetchResearchPosts = async () => {
  const listingResponse = await fetch(researchApiUrl, { headers: { Accept: 'application/vnd.github+json' } });
  if (!listingResponse.ok) throw new Error(`Research listing failed: ${listingResponse.status}`);
  const files = await listingResponse.json();
  const markdownFiles = files.filter((file) => file.type === 'file' && file.name.endsWith('.md'));

  const posts = await Promise.all(markdownFiles.map(async (file) => {
    const response = await fetch(`${researchRawBase}${file.path.split('/').map(encodeURIComponent).join('/')}`);
    if (!response.ok) throw new Error(`Research post failed: ${response.status}`);
    const parsed = parseFrontMatter(await response.text());
    return { ...parsed.data, body: parsed.body, path: file.path };
  }));

  return posts.sort((first, second) => String(second.date || '').localeCompare(String(first.date || '')));
};

const createResearchCard = (post) => {
  const link = `research/article.html?path=${encodeURIComponent(post.path)}`;
  const image = post.featured_image
    ? `<img src="${escapeHtml(toSiteUrl(post.featured_image))}" alt="${escapeHtml(post.title || '')} 대표 이미지">`
    : '<span>RESEARCH</span>';

  return `<a class="research-card" href="${link}">
    <div class="research-card-media">${image}</div>
    <span>${escapeHtml(post.category || 'RESEARCH')} · ${escapeHtml(formatDate(post.date))}</span>
    <h3>${escapeHtml(post.title || '제목 없음')}</h3>
    <p>${escapeHtml(post.summary || '')}</p>
    <b aria-hidden="true">↗</b>
  </a>`;
};

const createArticleIndexItem = (post) => {
  const link = `article.html?path=${encodeURIComponent(post.path)}`;
  return `<a class="article-index-item" href="${link}">
    <span class="article-index-meta">${escapeHtml(post.category || 'RESEARCH')} · ${escapeHtml(formatDate(post.date))}</span>
    <h2>${escapeHtml(post.title || '제목 없음')}</h2>
    <p>${escapeHtml(post.summary || '')}</p>
    <span class="arrow" aria-hidden="true">↗</span>
  </a>`;
};

const renderResearch = async () => {
  const cardGrid = document.querySelector('#research .research-grid');
  const archiveList = document.querySelector('.article-index-list');
  if (!cardGrid && !archiveList) return;

  try {
    const posts = await fetchResearchPosts();
    if (!posts.length) return;
    if (cardGrid) cardGrid.innerHTML = posts.slice(0, 4).map(createResearchCard).join('');
    if (archiveList) archiveList.innerHTML = posts.map(createArticleIndexItem).join('');
  } catch (error) {
    console.warn('CMS research content could not be loaded; keeping fallback content.', error);
  }
};

renderResearch();
