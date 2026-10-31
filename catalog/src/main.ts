import 'didactics/styles/review-all.css';
import './catalog.css';
import courses from 'virtual:courses';
import { allCoursesReview } from 'didactics/review-all';
import { el } from 'didactics/dom';
import { catalogPage } from './page';

const read = (key: string) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};
// The catalog, or at #review the review of every course's cards together.
const root = document.getElementById('catalog')!;
const show = () => {
  if (location.hash === '#review') {
    root.replaceChildren(el('div.catalog', {}, allCoursesReview({
      courses: courses.map((c) => ({ key: c.folder, title: c.title, save: c.save, href: `./${c.folder}/`, icon: c.icon, theme: c.theme })),
      back: { href: '#', label: '← The catalog' },
    })));
    window.scrollTo(0, 0);
  } else {
    root.replaceChildren(catalogPage(courses, read));
  }
};
window.addEventListener('hashchange', () => {
  // A department's anchor scrolls the catalog; only #review and back swap the page.
  if (location.hash === '#review' || !root.querySelector('.masthead') || location.hash === '' || location.hash === '#') show();
});
show();

// The one service worker for the whole site: it keeps every course's page and
// photos for offline use. This page holds nothing of the reader's, so a new
// version is taken as soon as it is found.
if (import.meta.env.PROD && 'serviceWorker' in navigator && location.protocol.startsWith('http')) {
  void import('virtual:pwa-register').then(({ registerSW }) => {
    const update = registerSW({ immediate: true, onNeedRefresh: () => void update(true) });
  });
}
