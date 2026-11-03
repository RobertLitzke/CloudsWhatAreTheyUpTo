// The course's large data files (the plate model behind the moving maps),
// fetched from data/ next to the page the first time a figure needs them
// rather than carried inside the page. Next to the page on the site, or from
// the site when the page was opened from disk (asset.ts). The site's service
// worker keeps each file once fetched, and Settings saves them all along with
// the photos and maps (offline.json lists them).

import { asset } from './asset';

const loaded = new Map<string, Promise<unknown>>();

/** A loader for data/<name>: fetched once, shared by every caller; a failed fetch is tried again next time. */
export function dataFile<T>(name: string): () => Promise<T> {
  return () => {
    let p = loaded.get(name) as Promise<T> | undefined;
    if (!p) {
      p = fetch(asset(`data/${name}`)).then((r) => {
        if (!r.ok) throw new Error(`data/${name}: ${r.status}`);
        return r.json() as Promise<T>;
      });
      p.catch(() => loaded.delete(name));
      loaded.set(name, p);
    }
    return p;
  };
}

/** Hand a file's contents over so no fetch is made: tests, or a page that carries the file. */
export function provideData(name: string, value: unknown): void {
  loaded.set(name, Promise.resolve(value));
}
