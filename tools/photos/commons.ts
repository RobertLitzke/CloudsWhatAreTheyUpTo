// The little of the Wikimedia Commons API the photo tools need: list the files
// in a category, and read a file's licence, author and a resized copy's URL.
// Commons asks every client to name itself in the User-Agent.

export const USER_AGENT = 'OutOfAuto/0.1 (https://github.com/RobertLitzke/Photography)';
const API = 'https://commons.wikimedia.org/w/api.php';

/** The licences the app accepts, as Commons spells them, mapped to the app's ids (src/core/photos.ts). */
export function licenseId(shortName: string): string | null {
  const s = shortName.trim().toLowerCase();
  if (s === 'public domain' || s.startsWith('pd') || s === 'no restrictions') return 'PD';
  if (s === 'cc0' || s.startsWith('cc0 ') || s.startsWith('cc-zero')) return 'CC0';
  const m = /^cc[ -]by(-sa)?[ -](2\.0|3\.0|4\.0)$/.exec(s);
  if (m) return `CC-BY${m[1] ? '-SA' : ''}-${m[2]}`;
  return null; // NonCommercial, NoDerivatives, GFDL-only, 2.5 and anything unclear are left out.
}

/** Commons gives the author as HTML, often a link to a user page. */
export function plainText(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\s*-*\s*-- ?\S*\s+\d\d:\d\d, \d+ \w+ \d{4} \(UTC\)$/, '') // a talk-page signature
    .trim();
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Fetch politely: one request at a time, and when Commons says slow down (429,
 * or a 5xx), wait and try again, a little longer each time. Shared cloud
 * machines hit the rate limit often.
 */
export async function politeFetch(url: string, body?: URLSearchParams, tries = 8): Promise<Response> {
  for (let i = 0; ; i++) {
    const res = await fetch(url, { method: body ? 'POST' : 'GET', body, headers: { 'User-Agent': USER_AGENT } });
    if (res.ok || i >= tries - 1 || (res.status !== 429 && res.status < 500)) return res;
    const after = Number(res.headers.get('retry-after')) || 0;
    await wait(Math.max(after * 1000, 1000 * 2 ** i));
  }
}

async function call(params: Record<string, string>): Promise<any> {
  // Posted, because fifty long file titles make a URL too long for a GET.
  const res = await politeFetch(API, new URLSearchParams({ format: 'json', formatversion: '2', ...params }));
  if (!res.ok) throw new Error(`Commons answered ${res.status} for ${params.action} ${params.titles ?? params.cmtitle ?? ''}`);
  return res.json();
}

export interface FileInfo {
  title: string;
  license: string | null;
  licenseName: string;
  author: string;
  pageUrl: string;
  /** A copy resized to the width asked for. */
  thumbUrl: string;
  width: number;
  height: number;
}

/**
 * Commons now hands out thumbnails on thumb.wikimedia.org, which some networks
 * (the cloud sessions' among them) do not reach. upload.wikimedia.org serves
 * the same path, so use that, without the tracking parameters.
 */
export function thumbHost(url: string): string {
  return url.replace('https://thumb.wikimedia.org/', 'https://upload.wikimedia.org/').replace(/\?utm_[^#]*$/, '');
}

/** Read up to 50 files at once. */
export async function fileInfo(titles: string[], thumbWidth: number): Promise<FileInfo[]> {
  const out: FileInfo[] = [];
  for (let i = 0; i < titles.length; i += 50) {
    const data = await call({
      action: 'query',
      titles: titles.slice(i, i + 50).join('|'),
      prop: 'imageinfo',
      iiprop: 'url|size|extmetadata',
      iiurlwidth: String(thumbWidth),
    });
    for (const page of data.query?.pages ?? []) {
      const ii = page.imageinfo?.[0];
      if (!ii) continue;
      const meta = ii.extmetadata ?? {};
      const short = meta.LicenseShortName?.value ?? '';
      out.push({
        title: page.title,
        license: licenseId(short),
        licenseName: short,
        author: plainText(meta.Artist?.value ?? '') || 'Unknown',
        pageUrl: ii.descriptionurl,
        thumbUrl: thumbHost(ii.thumburl ?? ii.url),
        width: ii.width,
        height: ii.height,
      });
    }
  }
  return out;
}

/** Every file directly in a category. */
export async function categoryFiles(category: string, limit = 500): Promise<string[]> {
  const titles: string[] = [];
  let cont: string | undefined;
  do {
    const data = await call({
      action: 'query',
      list: 'categorymembers',
      cmtitle: `Category:${category}`,
      cmtype: 'file',
      cmlimit: '500',
      ...(cont ? { cmcontinue: cont } : {}),
    });
    for (const m of data.query?.categorymembers ?? []) titles.push(m.title);
    cont = data.continue?.cmcontinue;
  } while (cont && titles.length < limit);
  return titles.slice(0, limit);
}
