// The little of the Wikimedia Commons API the photo tools need: list the files
// in a category, and read a file's licence, author and a resized copy's URL.
// Commons asks every client to name itself in the User-Agent.

export const USER_AGENT = 'CloudsWhatAreTheyUpTo/0.1 (https://github.com/RobertLitzke/CloudsWhatAreTheyUpTo)';
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
    .trim();
}

async function call(params: Record<string, string>): Promise<any> {
  const url = `${API}?${new URLSearchParams({ format: 'json', formatversion: '2', ...params })}`;
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error(`Commons answered ${res.status} for ${url}`);
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
        thumbUrl: ii.thumburl ?? ii.url,
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
