// The signal chain as a strip of boxes: where a note goes after the
// oscillators, in order. The drive moves along it with the chain setting, and a
// pedal that is switched off is drawn faint.

import { CHAIN, type Sound } from '../../core/params';
import { el } from '../dom';

export interface Flow {
  el: HTMLElement;
  set(sound: Sound): void;
}

type Box = 'osc' | 'filter' | 'drive' | 'echo';

const NAMES: Record<Box, string> = { osc: 'Osc', filter: 'Filter', drive: 'Drive', echo: 'Echo' };

const ORDERS: Record<number, readonly Box[]> = {
  [CHAIN.first]: ['osc', 'drive', 'filter', 'echo'],
  [CHAIN.middle]: ['osc', 'filter', 'drive', 'echo'],
  [CHAIN.last]: ['osc', 'filter', 'echo', 'drive'],
};

export function createFlow(): Flow {
  const root = el('div.flow', { role: 'img' });
  return {
    el: root,
    set(sound) {
      const order = ORDERS[Math.round(sound.chain)] ?? ORDERS[CHAIN.middle];
      const off = (box: Box) => (box === 'drive' && sound.drive === 0) || (box === 'echo' && sound.echoMix === 0);
      const boxes: HTMLElement[] = [];
      order.forEach((box, i) => {
        if (i > 0) boxes.push(el('span.flow-arrow', { 'aria-hidden': 'true' }, '›'));
        boxes.push(el(`span.flow-box.flow-${box}${off(box) ? '.bypassed' : ''}`, {}, NAMES[box]));
      });
      root.replaceChildren(...boxes);
      root.setAttribute(
        'aria-label',
        `Signal chain: ${order.map((box) => (off(box) ? `${NAMES[box]} (off)` : NAMES[box])).join(', then ')}`,
      );
    },
  };
}
