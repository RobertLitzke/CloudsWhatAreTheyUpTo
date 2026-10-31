import './catalog.css';
import courses from 'virtual:courses';
import { catalogPage } from './page';

const read = (key: string) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};
document.getElementById('catalog')!.replaceChildren(catalogPage(courses, read));

// The one service worker for the whole site: it keeps every course's page and
// photos for offline use. This page holds nothing of the reader's, so a new
// version is taken as soon as it is found.
if (import.meta.env.PROD && 'serviceWorker' in navigator && location.protocol.startsWith('http')) {
  void import('virtual:pwa-register').then(({ registerSW }) => {
    const update = registerSW({ immediate: true, onNeedRefresh: () => void update(true) });
  });
}
