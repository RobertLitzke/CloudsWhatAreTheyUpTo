// Where the files that are not inlined (photos, the poster) come from. On the
// site they sit next to the page. A downloaded copy of the page opened from
// disk has nothing next to it, so it fetches them from the site instead, and
// shows them whenever the phone is online.

export const SITE_URL = 'https://robertlitzke.github.io/CloudsWhatAreTheyUpTo/';

/** True when the page was opened from a file rather than from a web server. */
export const fromDisk = !location.protocol.startsWith('http');

export function asset(path: string): string {
  return fromDisk ? SITE_URL + path : path;
}
