import 'didactics/styles/review-all.css';
import './catalog.css';
import courses, { map } from 'virtual:courses';
import { allCoursesReview } from 'didactics/review-all';
import { el } from 'didactics/dom';
import { homePage } from './home';
import { mapPage } from './page';

const read = (key: string) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};
const write = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Private browsing: the hint comes back next time.
  }
};
// The shelves at the front; #review, the review of every course's cards
// together; #map, the map and full listing, which any other anchor (a
// department, a bridge) is a place on.
const root = document.getElementById('catalog')!;
type View = 'home' | 'review' | 'map';
const viewOf = (hash: string): View => (hash === '#review' ? 'review' : hash === '' || hash === '#' ? 'home' : 'map');
let shown: View | null = null;
const show = () => {
  const view = viewOf(location.hash);
  if (view === shown) return;
  shown = view;
  if (view === 'review') {
    root.replaceChildren(el('div.catalog', {}, allCoursesReview({
      courses: courses.map((c) => ({ key: c.folder, title: c.title, save: c.save, href: `./${c.folder}/`, icon: c.icon, theme: c.theme })),
      back: { href: '#', label: '← The shelves' },
    })));
  } else if (view === 'map') {
    root.replaceChildren(mapPage(courses, read, map));
  } else {
    root.replaceChildren(homePage(courses, read, map, { write }));
  }
  const anchor = location.hash.length > 1 && location.hash !== '#map' ? document.getElementById(location.hash.slice(1)) : null;
  if (anchor) anchor.scrollIntoView();
  else window.scrollTo(0, 0);
};
window.addEventListener('hashchange', show);
// Coming back to the page (from a course, by Back) shows the desk as it is now.
window.addEventListener('pageshow', (e) => {
  if (e.persisted) {
    shown = null;
    show();
  }
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
