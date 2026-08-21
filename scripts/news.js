import { getMetadata } from './aem.js';
import { rootLink, setJsonLd } from './commerce.js';

function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function createLink(pathname, label) {
  const anchor = document.createElement('a');
  anchor.href = rootLink(pathname);
  anchor.textContent = label;
  return anchor;
}

function decorateByline(main) {
  const author = getMetadata('author');
  const authorSlug = getMetadata('author-slug');
  const publicationDate = getMetadata('publication-date');
  const tags = getMetadata('news-tags')
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);

  if (!author && !publicationDate && !tags.length) return;

  const heading = main.querySelector('h1');
  if (!heading) return;

  const byline = document.createElement('p');
  byline.className = 'news-byline';

  const metaParts = [];
  if (author) {
    const authorPath = authorSlug ? `/news/authors/${encodeURIComponent(authorSlug)}` : '';
    if (authorPath) {
      metaParts.push(createLink(authorPath, author));
    } else {
      const span = document.createElement('span');
      span.textContent = author;
      metaParts.push(span);
    }
  }

  const formattedDate = formatDate(publicationDate);
  if (formattedDate) {
    const date = document.createElement('time');
    date.dateTime = publicationDate;
    date.textContent = formattedDate;
    metaParts.push(date);
  }

  metaParts.forEach((part, index) => {
    if (index > 0) {
      byline.append(document.createTextNode(' \u2022 '));
    }
    byline.append(part);
  });

  if (tags.length) {
    const tagWrapper = document.createElement('span');
    tagWrapper.className = 'news-byline__tags';
    tags.forEach((tag, index) => {
      if (index > 0) tagWrapper.append(document.createTextNode(', '));
      tagWrapper.append(createLink(`/news/tags/${encodeURIComponent(tag)}`, tag));
    });
    byline.append(document.createTextNode(' \u2022 '));
    byline.append(tagWrapper);
  }

  heading.insertAdjacentElement('afterend', byline);
}

function emitArticleJsonLd() {
  const headline = getMetadata('og:title') || document.title;
  const description = getMetadata('description');
  const image = getMetadata('og:image');
  const publicationDate = getMetadata('publication-date');
  const author = getMetadata('author');

  const article = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline,
    description,
    image: image ? [image] : undefined,
    datePublished: publicationDate || undefined,
    dateModified: publicationDate || undefined,
    author: author ? { '@type': 'Person', name: author } : undefined,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': window.location.href,
    },
  };

  setJsonLd(article, 'news-article');

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: window.location.origin,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'news',
        item: new URL(rootLink('/news'), window.location.origin).toString(),
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: getMetadata('title') || document.title,
        item: window.location.href,
      },
    ],
  };

  setJsonLd(breadcrumb, 'news-breadcrumb');
}

export function decorateNews(main) {
  if (getMetadata('template') !== 'news-article') return;
  decorateByline(main);
  emitArticleJsonLd();
}