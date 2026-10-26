// Where the files that are not inlined (photos, a poster) come from. On the
// site they sit next to the page. A downloaded copy of the page opened from
// disk has nothing next to it, so it fetches them from the site instead, and
// shows them whenever the phone is online.

/** True when the page was opened from a file rather than from a web server. */
export const fromDisk = typeof location !== 'undefined' && !location.protocol.startsWith('http');

/** A resolver for paths next to the page, falling back to `siteUrl` (ending in /) when opened from disk. */
export function assetFrom(siteUrl: string): (path: string) => string {
  return (path) => (fromDisk ? siteUrl + path : path);
}
