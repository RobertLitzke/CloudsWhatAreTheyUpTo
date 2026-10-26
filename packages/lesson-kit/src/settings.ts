// The settings page every lesson app has: the name on the log, units, the
// radio, moving progress between devices, the app as one file, and erasing
// progress. An app says what its own words are and adds any sections it needs.

import { fromDisk } from './asset';
import { el, type Child } from './dom';
import type { Progress, Units } from './progress';
import type { View } from './router';
import type { Store } from './store';
import { segmented, toast } from './ui';

export interface SettingsOptions<S extends Progress> {
  store: Store<S>;
  empty: () => S;
  /** The app's short name, as in "That file is not a Clouds save." */
  appName: string;
  /** The name a saved progress file gets, such as "clouds-save.json". */
  saveFile: string;
  /** A units switch, with the field's label, such as "Heights in". */
  units?: { label: string; imperial: string; metric: string };
  /** A radio switch, with a line on what the talks are. */
  radio?: { blurb: string };
  /** The one-file copy of the app (see vite.ts oneFileCopy): its URL and file name. */
  oneFile?: { href: string; name: string };
  /** More, under About, before the erase button. */
  about?: Child;
  home?: string;
}

export function settingsView<S extends Progress>(o: SettingsOptions<S>): View {
  const { store } = o;
  return (root) => {
    const save = store.get();
    const name = el('input', { type: 'text', maxLength: 40, value: save.name, placeholder: 'Your name' }) as HTMLInputElement;
    name.addEventListener('change', () => store.update((s) => ({ ...s, name: name.value.trim() })));

    const file = el('input', { type: 'file', accept: 'application/json,.json', hidden: true }) as HTMLInputElement;
    file.addEventListener('change', async () => {
      const f = file.files?.[0];
      if (!f) return;
      toast(store.importText(await f.text()) ? 'Progress loaded.' : `That file is not a ${o.appName} save.`);
      file.value = '';
    });

    const download = () => {
      const blob = new Blob([store.exportText()], { type: 'application/json' });
      const a = el('a', { href: URL.createObjectURL(blob), download: o.saveFile }) as HTMLAnchorElement;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    };

    root.append(
      el(
        'div.page.settings',
        {},
        el('h1', {}, 'Settings'),
        el('label.field', {}, el('span', {}, 'Name on the logbook'), name),
        o.units
          ? el(
              'div.field',
              {},
              el('span', {}, o.units.label),
              segmented<Units>(
                [
                  { value: 'imperial', label: o.units.imperial },
                  { value: 'metric', label: o.units.metric },
                ],
                save.units,
                (units) => store.update((s) => ({ ...s, units })),
              ),
            )
          : null,
        o.radio
          ? [
              el(
                'div.field',
                {},
                el('span', {}, 'Radio talks'),
                segmented(
                  [
                    { value: 1, label: 'On' },
                    { value: 0, label: 'Off' },
                  ] as const,
                  save.talk ? 1 : 0,
                  (on) => store.update((s) => ({ ...s, talk: on === 1 })),
                ),
              ),
              el('p.muted', {}, o.radio.blurb),
              el(
                'button.btn.btn-ghost',
                {
                  type: 'button',
                  onclick: () => {
                    store.update((s) => ({ ...s, talk: true, introSeen: false }));
                    location.hash = `#${o.home ?? '/home'}`;
                  },
                },
                'Hear the opening talk again',
              ),
            ]
          : null,
        el('h2', {}, 'Progress'),
        el('p.muted', {}, 'Progress lives in this browser. Save it to a file to move it to another device.'),
        el(
          'div.row',
          {},
          el('button.btn', { type: 'button', onclick: download }, 'Save to file'),
          el('button.btn.btn-ghost', { type: 'button', onclick: () => file.click() }, 'Load from file'),
          file,
        ),
        o.oneFile
          ? [
              el('h2', {}, 'The app as one file'),
              el(
                'p.muted',
                {},
                fromDisk
                  ? 'This is the downloaded copy. It works with no connection; the photos come from the website, so they show only when you are online. Its progress is kept apart from the website’s, so use Save to file to carry progress across.'
                  : 'Everything but the photos in a single page, to keep on a phone or pass to someone. It works with no connection, and shows the photos whenever you are online. Its progress is kept apart from this one’s.',
              ),
              el('a.btn.btn-ghost', { href: o.oneFile.href, download: o.oneFile.name }, fromDisk ? 'Download the latest copy' : `Download ${o.oneFile.name}`),
            ]
          : null,
        o.about ? [el('h2', {}, 'About'), o.about] : null,
        el(
          'button.btn.btn-danger',
          {
            type: 'button',
            onclick: () => {
              if (!confirm('Erase all progress?')) return;
              store.set(o.empty());
              toast('Progress erased.');
            },
          },
          'Erase progress',
        ),
      ),
    );
  };
}
