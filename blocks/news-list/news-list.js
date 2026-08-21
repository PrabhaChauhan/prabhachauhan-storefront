import { createOptimizedPicture, readBlockConfig } from '../../scripts/aem.js';
import { fetchIndex, rootLink } from '../../scripts/commerce.js';

function toArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  return String(value).split(',').map((item) => item.trim()).filter(Boolean);
}

function toTimestamp(value) {
  if (!value) return 0;
  const time = Date.parse(value);
  return Number.isNaN(time) ? 0 : time;
}

function normalizeRecord(record) {
  return {
    ...record,
    path: record.path || '',
    title: record.title || '',
    description: record.description || '',
    image: record.image || '',
    newsCategory: record.newsCategory || '',
    newsTags: toArray(record.newsTags),
    author: record.author || '',
    authorSlug: record.authorSlug || '',
    publicationDate: record.publicationDate || '',
    template: record.template || '',
  };
}

function applyFilters(posts, config) {
  let result = posts.filter((post) => post.template === 'news-article');

  if (config.category) {
    const category = config.category.toLowerCase();
    result = result.filter((post) => post.newsCategory.toLowerCase() === category);
  }

  if (config.author) {
    const author = config.author.toLowerCase();
    result = result.filter(
      (post) => post.author.toLowerCase() === author || post.authorSlug.toLowerCase() === author,
    );
  }

  if (config.tag) {
    const tag = config.tag.toLowerCase();
    result = result.filter((post) => post.newsTags.some((item) => item.toLowerCase() === tag));
  }

  const sortValue = (config.sort || 'publication-date:desc').toLowerCase();
  const ascending = sortValue.endsWith(':asc');

  result.sort((a, b) => {
    const delta = toTimestamp(a.publicationDate) - toTimestamp(b.publicationDate);
    return ascending ? delta : -delta;
  });

  if (config.limit) {
    const limit = Number.parseInt(config.limit, 10);
    if (!Number.isNaN(limit) && limit > 0) {
      result = result.slice(0, limit);
    }
  }

  return result;
}

function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function buildTagChip(tag) {
  const anchor = document.createElement('a');
  anchor.className = 'news-list__chip';
  anchor.href = rootLink(`/news/tags/${encodeURIComponent(tag)}`);
  anchor.textContent = tag;
  return anchor;
}

function buildCategoryChip(category) {
  const anchor = document.createElement('button');
  anchor.type = 'button';
  anchor.className = 'news-list__chip';
  anchor.textContent = category;
  anchor.dataset.category = category;
  return anchor;
}

function createCard(post) {
  const card = document.createElement('article');
  card.className = 'news-list__card';

  const link = document.createElement('a');
  link.className = 'news-list__card-link';
  link.href = rootLink(`/${post.path.replace(/^\/+/, '')}`);

  if (post.image) {
    const picture = createOptimizedPicture(post.image, post.title, false, [{ width: '750' }]);
    picture.classList.add('news-list__image');
    link.append(picture);
  }

  const content = document.createElement('div');
  content.className = 'news-list__content';

  const meta = document.createElement('p');
  meta.className = 'news-list__meta';
  const metaParts = [
    post.newsCategory,
    formatDate(post.publicationDate),
    post.author,
  ].filter(Boolean);
  meta.textContent = metaParts.join(' \u2022 ');
  if (meta.textContent) {
    content.append(meta);
  }

  const title = document.createElement('h3');
  title.className = 'news-list__title';
  title.textContent = post.title;
  content.append(title);

  if (post.description) {
    const description = document.createElement('p');
    description.className = 'news-list__description';
    description.textContent = post.description;
    content.append(description);
  }

  if (post.newsTags.length) {
    const tags = document.createElement('div');
    tags.className = 'news-list__tags';
    post.newsTags.slice(0, 3).forEach((tag) => tags.append(buildTagChip(tag)));
    content.append(tags);
  }

  link.append(content);
  card.append(link);
  return card;
}

function renderEmptyState(container) {
  const empty = document.createElement('p');
  empty.className = 'news-list__empty';
  empty.textContent = 'No news posts found for the selected filters.';
  container.append(empty);
}

function renderCategoryChips(root, categories, activeCategory, onClick) {
  if (!categories.length || activeCategory) return;
  const chips = document.createElement('div');
  chips.className = 'news-list__chips';

  categories.forEach((category) => {
    const chip = buildCategoryChip(category);
    chip.addEventListener('click', () => onClick(category));
    chips.append(chip);
  });

  root.append(chips);
}

export default async function decorate(block) {
  const config = readBlockConfig(block);
  const index = await fetchIndex('news-index');
  const posts = (index.data || []).map(normalizeRecord);
  const categories = [...new Set(posts.map((post) => post.newsCategory).filter(Boolean))];

  const wrapper = document.createElement('div');
  wrapper.className = 'news-list';
  const list = document.createElement('div');
  list.className = 'news-list__grid';
  wrapper.append(list);

  const render = (categoryOverride = '') => {
    list.innerHTML = '';
    const filtered = applyFilters(posts, {
      ...config,
      category: categoryOverride || config.category || '',
    });

    if (!filtered.length) {
      renderEmptyState(list);
      return;
    }
    filtered.forEach((post) => list.append(createCard(post)));
  };

  renderCategoryChips(wrapper, categories, config.category, (category) => {
    wrapper.querySelectorAll('.news-list__chip').forEach((chip) => {
      chip.classList.toggle('is-active', chip.dataset.category === category);
    });
    render(category);
  });

  block.innerHTML = '';
  block.append(wrapper);
  render();
}