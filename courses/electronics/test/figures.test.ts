// @vitest-environment happy-dom
// Every figure builds, the ones in lessons with their lesson's options, and the board draws.
import { describe, expect, it } from 'vitest';
import { isDiagram } from 'didactics/blocks';
import { testContext } from 'didactics/figure';
import { FIGURES } from '../src/app/figures';
import { makeBoard } from '../src/app/scene/board';
import { LESSONS, type FigureId } from '../src/core/lessons';
import { emptySave } from '../src/core/save';

const ctx = () => testContext(emptySave());

describe('figures', () => {
  it('all build on their own', () => {
    for (const id of Object.keys(FIGURES) as FigureId[]) {
      if (FIGURES[id].quiz) continue;
      expect(FIGURES[id](ctx()).node, id).toBeInstanceOf(HTMLElement);
    }
  });

  it('all build as the lessons use them', () => {
    for (const l of LESSONS) for (const p of l.parts) for (const b of p.blocks) {
      if (!isDiagram(b)) continue;
      expect(FIGURES[b.id](ctx(), b.goal, b.options).node, b.id).toBeInstanceOf(HTMLElement);
    }
  });

  it('the loop dims its lamp, and stops when the switch opens', async () => {
    const loop = FIGURES.loop(ctx(), 'dim');
    const [, resistor] = loop.node.querySelectorAll('input');
    resistor.value = '150';
    resistor.dispatchEvent(new Event('input'));
    await expect(loop.done).resolves.toBeUndefined();
    expect(loop.node.textContent).toContain('50 mA');
    loop.node.querySelector('.switch')!.dispatchEvent(new Event('click'));
    expect(loop.node.textContent).toContain('switch is open');
  });
});

describe('the board', () => {
  it('draws the same board from the same seed', () => {
    expect(makeBoard({ seed: 3 }).outerHTML).toBe(makeBoard({ seed: 3 }).outerHTML);
  });
});

describe('lesson 1', () => {
  const click = (el: Element) => el.dispatchEvent(new Event('click', { bubbles: true }));
  const chip = (node: HTMLElement, text: string) => [...node.querySelectorAll('.chip')].find((c) => c.textContent?.includes(text))!;

  it('keeps the bulbs covered until a guess is locked in', async () => {
    const fig = FIGURES['series-bulbs'](ctx(), 'reveal');
    expect(fig.node.querySelector('.glow')!.getAttribute('opacity')).toBe('0');
    click(chip(fig.node, 'A, the first'));
    click([...fig.node.querySelectorAll('button')].find((b) => b.textContent === 'Lock it in')!);
    await expect(fig.done).resolves.toBeUndefined();
    expect(fig.node.textContent).toContain('Most people guess A');
    expect(Number(fig.node.querySelector('.glow')!.getAttribute('opacity'))).toBeGreaterThan(0);
  });

  it('measures volts across and blows its fuse in amps across a part', async () => {
    const fig = FIGURES.meter(ctx(), 'amps');
    click(chip(fig.node, 'Amps'));
    const hits = fig.node.querySelectorAll('polyline[stroke="transparent"]');
    click(hits[2]); // the resistor
    expect(fig.node.textContent).toContain('fuse blew');
    click([...fig.node.querySelectorAll('button')].find((b) => b.textContent === 'Fit a new fuse')!);
    click(hits[1]); // a plain wire
    await expect(fig.done).resolves.toBeUndefined();
    expect(fig.node.textContent).toMatch(/\d+ mA flows through the meter/);
  });

  it('hits 20 mA with a 470 Ω resistor', async () => {
    const fig = FIGURES['ohm-target'](ctx(), 'hit');
    const input = fig.node.querySelector('input')!;
    input.value = '8'; // 100, 120, … 470 is the ninth value
    input.dispatchEvent(new Event('input'));
    await expect(fig.done).resolves.toBeUndefined();
    expect(fig.node.textContent).toContain('470 Ω');
    expect(fig.node.querySelectorAll('.star.got').length).toBe(3);
  });

  it('traces a straight resistor, then a lamp that bends over', async () => {
    const fig = FIGURES['iv-curve'](ctx(), 'lamp');
    const sweep = () => {
      const input = fig.node.querySelector('input')!;
      for (let v = 0; v <= 12; v += 0.5) {
        input.value = String(v);
        input.dispatchEvent(new Event('input'));
      }
    };
    sweep();
    expect(fig.node.textContent).toContain('A straight line');
    click([...fig.node.querySelectorAll('button')].find((b) => b.textContent === 'Swap in the lamp')!);
    click(chip(fig.node, 'bends over'));
    click([...fig.node.querySelectorAll('button')].find((b) => b.textContent === 'Lock it in')!);
    sweep();
    await expect(fig.done).resolves.toBeUndefined();
    expect(fig.node.textContent).toContain('bends over');
  });
});

describe('lesson 2', () => {
  const click = (el: Element) => el.dispatchEvent(new Event('click', { bubbles: true }));
  const chip = (node: HTMLElement, text: string) => [...node.querySelectorAll('.chip')].find((c) => c.textContent?.includes(text))!;
  const button = (node: HTMLElement, text: string) => [...node.querySelectorAll('button')].find((b) => b.textContent?.includes(text))!;
  const lockGuess = (node: HTMLElement, option: string) => {
    click(chip(node, option));
    click([...node.querySelectorAll('button')].find((b) => b.textContent === 'Lock it in' && !b.disabled)!);
  };

  it('doubles the battery current when a parallel bulb goes in', async () => {
    const fig = FIGURES['parallel-bulbs'](ctx(), 'reveal');
    lockGuess(fig.node, 'stays the same');
    await expect(fig.done).resolves.toBeUndefined();
    expect(fig.node.textContent).toContain('twice as much');
  });

  it('ranks A brightest, then dims A when C comes out', async () => {
    const fig = FIGURES.ranking(ctx(), 'rank');
    lockGuess(fig.node, 'A, then B and C equal');
    expect(fig.node.textContent).toContain('splits into');
    lockGuess(fig.node, 'A dims');
    await expect(fig.done).resolves.toBeUndefined();
    expect(fig.node.textContent).toContain('With C out');
  });

  it('sets three branches to draw 30 mA', async () => {
    const fig = FIGURES.junction(ctx(), 'target');
    const [r1, r2, r3] = fig.node.querySelectorAll('input');
    // 470 Ω, 1 kΩ, 4.7 kΩ: 19.1 + 9 + 1.9 = 30 mA.
    for (const [input, k] of [[r1, 8], [r2, 12], [r3, 20]] as const) {
      input.value = String(k);
      input.dispatchEvent(new Event('input'));
    }
    await expect(fig.done).resolves.toBeUndefined();
  });

  it('joins cells three ways, and the flat one takes current', async () => {
    const fig = FIGURES.cells(ctx(), 'all');
    click(chip(fig.node, 'Side by side'));
    expect(fig.node.textContent).toContain('last twice as long');
    click(chip(fig.node, 'one flat'));
    expect(fig.node.textContent).toContain('takes');
    await expect(fig.done).resolves.toBeUndefined();
  });

  it('finds the broken wire with the meter', async () => {
    const fig = FIGURES['broken-wire'](ctx(), 'find');
    const hits = fig.node.querySelectorAll('polyline[stroke="transparent"]');
    click(button(fig.node, 'Mark the fault'));
    click(hits[6]); // bulb B: wrong
    expect(fig.node.textContent).toContain('Not that one');
    click(button(fig.node, 'Mark the fault'));
    click(hits[7]); // the wire under B
    await expect(fig.done).resolves.toBeUndefined();
    expect(fig.node.textContent).toContain('Found it');
  });
});

describe('lesson 3', () => {
  const click = (el: Element) => el.dispatchEvent(new Event('click', { bubbles: true }));
  const chip = (node: HTMLElement, text: string) => [...node.querySelectorAll('.chip')].find((c) => c.textContent?.includes(text))!;
  const set = (input: HTMLInputElement, v: number) => {
    input.value = String(v);
    input.dispatchEvent(new Event('input'));
  };
  const index = (ohms: number) => [100, 120, 150, 180, 220, 270, 330, 390, 470, 560, 680, 820].indexOf(ohms);

  it('holds 3 V under load only with a stiff divider', async () => {
    const fig = FIGURES.sag(ctx(), 'stiff');
    const [r1, r2] = fig.node.querySelectorAll('input');
    expect(fig.node.textContent).toContain('With the 4.7 kΩ load on: 2 V');
    set(r1, index(680));
    set(r2, index(330));
    await expect(fig.done).resolves.toBeUndefined();
    expect(fig.node.textContent).toContain('The output holds');
  });

  it('models box 1 as 9 V behind 20 Ω, and box 3 refuses a line', async () => {
    const fig = FIGURES['mystery-box'](ctx(), 'inside');
    const inputs = fig.node.querySelectorAll('input');
    click(chip(fig.node, 'Short it'));
    expect(fig.node.textContent).toContain('450 mA');
    set(inputs[1], 9);
    set(inputs[2], 20);
    expect(fig.node.textContent).toContain('Your model fits');
    click(chip(fig.node, 'Box 3'));
    click(chip(fig.node, 'Short it'));
    for (const k of [24, 26, 28, 30]) set(inputs[0], k);
    await expect(fig.done).resolves.toBeUndefined();
    expect(fig.node.textContent).toContain('solar panel');
  });

  it('turns the pot to half the supply', async () => {
    const fig = FIGURES.pot(ctx(), 'half');
    set(fig.node.querySelector('input')!, 50);
    await expect(fig.done).resolves.toBeUndefined();
  });
});

describe('lesson 4', () => {
  const click = (el: Element) => el.dispatchEvent(new Event('click', { bubbles: true }));
  const chip = (node: HTMLElement, text: string) => [...node.querySelectorAll('.chip')].find((c) => c.textContent === text)!;

  it('stalls the pump on thin cable and runs it at 48 V', async () => {
    const fig = FIGURES['long-wire'](ctx(), 'pump');
    expect(fig.node.textContent).toContain('The pump stalls');
    click(chip(fig.node, '10 mm²'));
    expect(fig.node.textContent).toContain('The pump receives');
    click(chip(fig.node, '1.5 mm²'));
    click(chip(fig.node, '48 V system'));
    await expect(fig.done).resolves.toBeUndefined();
    expect(fig.node.querySelectorAll('.star.got').length).toBe(3);
  });

  it('protects the cable only with a 15 A fuse', async () => {
    const fig = FIGURES.fuse(ctx(), 'protect');
    const tryAll = () => ['Running', 'Motor jams', 'Cable shorts'].forEach((k) => click(chip(fig.node, k)));
    click(chip(fig.node, '30 A fuse'));
    click(chip(fig.node, 'Motor jams'));
    expect(fig.node.textContent).toContain('melt its insulation');
    click(chip(fig.node, '15 A fuse'));
    tryAll();
    await expect(fig.done).resolves.toBeUndefined();
  });

  it('wastes half at the matched load', async () => {
    const fig = FIGURES.matching(ctx(), 'peak');
    const input = fig.node.querySelector('input')!;
    input.value = '4';
    input.dispatchEvent(new Event('input'));
    await expect(fig.done).resolves.toBeUndefined();
    expect(fig.node.textContent).toContain('50% of the total energy');
  });
});

describe('lesson 5', () => {
  const click = (el: Element) => el.dispatchEvent(new Event('click', { bubbles: true }));
  const chip = (node: HTMLElement, text: string) => [...node.querySelectorAll('.chip')].find((c) => c.textContent === text)!;
  const lock = (node: HTMLElement, text: string) => {
    click(chip(node, text));
    click([...node.querySelectorAll('button')].find((b) => b.textContent === 'Lock it in')!);
  };
  const set = (input: HTMLInputElement, v: number) => {
    input.value = String(v);
    input.dispatchEvent(new Event('input'));
  };

  it('matches the target sine, then plays a guitar note', async () => {
    const fig = FIGURES.sine(ctx(), 'match');
    const [amp, hz] = fig.node.querySelectorAll('input');
    set(amp, 3);
    set(hz, 150);
    await expect(fig.done).resolves.toBeUndefined();
    click(chip(fig.node, 'A guitar note'));
    expect(fig.node.textContent).toContain('harmonics');
  });

  it('clips the bottom off, then fits the biggest swing at half the supply', async () => {
    const fig = FIGURES.offset(ctx(), 'centre');
    expect(fig.node.textContent).toContain('Guess first');
    lock(fig.node, 'The bottom of the wave is cut flat');
    expect(fig.node.textContent).toContain('bottom of the wave is cut flat');
    const [steady, swing] = fig.node.querySelectorAll('input');
    set(steady, 4.5);
    set(swing, 3);
    await expect(fig.done).resolves.toBeUndefined();
    expect(fig.node.querySelectorAll('.star.got').length).toBe(3);
    set(swing, 3.5);
    expect(fig.node.textContent).toContain('top and bottom');
  });
});

describe('lesson 6', () => {
  const click = (el: Element) => el.dispatchEvent(new Event('click', { bubbles: true }));
  const chip = (node: HTMLElement, text: string) => [...node.querySelectorAll('.chip')].find((c) => c.textContent === text)!;
  const lock = (node: HTMLElement, text: string) => {
    click(chip(node, text));
    click([...node.querySelectorAll('button')].find((b) => b.textContent === 'Lock it in')!);
  };

  it('takes a second with 100 kΩ and 10 µF, and with 10 kΩ and 100 µF', async () => {
    const fig = FIGURES['rc-charge'](ctx(), 'tau');
    lock(fig.node, 'fast at first, then slower and slower');
    click(chip(fig.node, '100 kΩ'));
    await expect(fig.done).resolves.toBeUndefined();
    click(chip(fig.node, '10 kΩ'));
    click(chip(fig.node, '100 µF'));
    expect(fig.node.querySelectorAll('.star.got').length).toBe(3);
  });

  it('passes the wiggle and keeps the steady part', async () => {
    const fig = FIGURES.coupling(ctx(), 'reveal');
    lock(fig.node, 'Just the wiggle, around 0 V');
    await expect(fig.done).resolves.toBeUndefined();
    expect(fig.node.textContent).toContain('1 V each way around 0 V');
    click(chip(fig.node, '1 nF'));
    expect(fig.node.textContent).toContain('too small');
  });

  it('finds the corner near 1.6 kHz', async () => {
    const fig = FIGURES.lowpass(ctx(), 'corner');
    const input = fig.node.querySelector('input')!;
    input.value = '58';
    input.dispatchEvent(new Event('input'));
    expect(fig.node.textContent).toContain('1.6 kHz');
    await expect(fig.done).resolves.toBeUndefined();
  });

  it('holds the supply up with 100 µF but not 10 µF', async () => {
    const fig = FIGURES.decoupling(ctx(), 'hold');
    click(chip(fig.node, '10 µF'));
    expect(fig.node.textContent).toContain('Try a larger capacitor');
    click(chip(fig.node, '100 µF'));
    await expect(fig.done).resolves.toBeUndefined();
    expect(fig.node.querySelectorAll('.star.got').length).toBe(2);
  });

  it('kicks back over a kilovolt', async () => {
    const fig = FIGURES.kickback(ctx(), 'spike');
    lock(fig.node, 'far more than 12 V, for an instant');
    await expect(fig.done).resolves.toBeUndefined();
    expect(fig.node.textContent).toMatch(/1\.\d+ kV/);
  });
});

describe('lesson 7', () => {
  const click = (el: Element) => el.dispatchEvent(new Event('click', { bubbles: true }));
  const chip = (node: HTMLElement, text: string) => [...node.querySelectorAll('.chip')].find((c) => c.textContent === text)!;
  const lock = (node: HTMLElement, text: string) => {
    click(chip(node, text));
    click([...node.querySelectorAll('button')].find((b) => b.textContent === 'Lock it in')!);
  };

  it('traces silicon, germanium and an LED', async () => {
    const fig = FIGURES['diode-iv'](ctx(), 'curves');
    lock(fig.node, 'stays near zero, then shoots up');
    expect(fig.node.textContent).toMatch(/Silicon, at 25 °C: 6\d\d mV/);
    click(chip(fig.node, 'Germanium'));
    click(chip(fig.node, 'Red LED'));
    await expect(fig.done).resolves.toBeUndefined();
  });

  it('lights the LED at 15 mA with 470 Ω', async () => {
    const fig = FIGURES['led-resistor'](ctx(), 'design');
    expect(fig.node.textContent).toContain('would soon fail');
    const input = fig.node.querySelector('input')!;
    input.value = '12';
    input.dispatchEvent(new Event('input'));
    expect(fig.node.textContent).toContain('470 Ω');
    await expect(fig.done).resolves.toBeUndefined();
    expect(fig.node.querySelectorAll('.star.got').length).toBe(3);
  });

  it('blocks a battery in backwards', async () => {
    const fig = FIGURES.reverse(ctx(), 'protect');
    click(chip(fig.node, 'Battery in backwards'));
    expect(fig.node.textContent).toContain('kills them');
    click(chip(fig.node, 'Silicon diode'));
    expect(fig.node.textContent).toContain('gets 0 V');
    await expect(fig.done).resolves.toBeUndefined();
  });

  it('smooths the rectifier with 1000 µF', async () => {
    const fig = FIGURES.rectifier(ctx(), 'smooth');
    click(chip(fig.node, '100 µF'));
    expect(fig.node.textContent).toContain('There is still a lot of ripple');
    click(chip(fig.node, '1000 µF'));
    await expect(fig.done).resolves.toBeUndefined();
  });

  it('clips at each kind of diode’s knee', async () => {
    const fig = FIGURES.clipper(ctx(), 'clip');
    lock(fig.node, 'The wave, cut flat at under a volt each way');
    click(chip(fig.node, 'Germanium'));
    click(chip(fig.node, 'Red LED'));
    await expect(fig.done).resolves.toBeUndefined();
    expect(fig.node.textContent).toMatch(/about 1\.\d+ V each way/);
  });
});

describe('lesson 8', () => {
  const click = (el: Element) => el.dispatchEvent(new Event('click', { bubbles: true }));
  const chip = (node: HTMLElement, text: string) => [...node.querySelectorAll('.chip')].find((c) => c.textContent === text)!;
  const button = (node: HTMLElement, text: string) => [...node.querySelectorAll('button')].find((b) => b.textContent?.includes(text))!;

  it('is half on with 22 kΩ, and hard on and lean with 4.7 kΩ', async () => {
    const fig = FIGURES['bjt-switch'](ctx(), 'hard');
    click(chip(fig.node, '22 kΩ'));
    expect(fig.node.textContent).toContain('Half on');
    click(chip(fig.node, '4.7 kΩ'));
    await expect(fig.done).resolves.toBeUndefined();
    expect(fig.node.querySelectorAll('.star.got').length).toBe(2);
  });

  it('runs the pump from 3.3 V only with a logic-level MOSFET', async () => {
    const fig = FIGURES['mosfet-switch'](ctx(), 'logic');
    click(chip(fig.node, 'runs weakly, and the MOSFET gets hot'));
    click(button(fig.node, 'Lock it in'));
    expect(fig.node.textContent).toContain('overheats');
    click(chip(fig.node, 'Logic-level MOSFET'));
    await expect(fig.done).resolves.toBeUndefined();
  });

  it('kicks the collector to hundreds of volts, and the diode stops it', async () => {
    const fig = FIGURES.relay(ctx(), 'safe');
    click(button(fig.node, 'Switch the relay off'));
    expect(fig.node.textContent).toMatch(/drives the collector to \d{3} V/);
    click(chip(fig.node, 'Flyback diode'));
    click(button(fig.node, 'Switch the relay off'));
    expect(fig.node.textContent).toMatch(/rises to 12\.\d+ V/);
    await expect(fig.done).resolves.toBeUndefined();
  });

  it('blinks once a second with 15 µF a side, or 10 and 22 µF', async () => {
    const fig = FIGURES.blinker(ctx(), 'second');
    click(chip(fig.node, 'drops 7 V with it, to well below ground'));
    click(button(fig.node, 'Lock it in'));
    expect(fig.node.textContent).toContain('Make it once a second');
    click(chip(fig.node, 'C1 15 µF'));
    click(chip(fig.node, 'C2 15 µF'));
    await expect(fig.done).resolves.toBeUndefined();
    click(chip(fig.node, 'C1 10 µF'));
    click(chip(fig.node, 'C2 22 µF'));
    expect(fig.node.querySelectorAll('.star.got').length).toBe(3);
  });
});

describe('lesson 9', () => {
  const click = (el: Element) => el.dispatchEvent(new Event('click', { bubbles: true }));
  const chip = (node: HTMLElement, text: string) => [...node.querySelectorAll('.chip')].find((c) => c.textContent === text)!;
  const set = (input: HTMLInputElement, v: number) => {
    input.value = String(v);
    input.dispatchEvent(new Event('input'));
  };

  it('biases the collector halfway with R2 at 10 kΩ', async () => {
    const fig = FIGURES.bias(ctx(), 'centre');
    expect(fig.node.textContent).toContain('Set the collector halfway');
    set(fig.node.querySelector('input')!, 8);
    expect(fig.node.textContent).toContain('R2 = 10 kΩ');
    await expect(fig.done).resolves.toBeUndefined();
  });

  it('gains about Rc over Re, then clips', async () => {
    const fig = FIGURES.gain(ctx(), 'clip');
    click(chip(fig.node, 'About 0.47 V each way, upside down'));
    click([...fig.node.querySelectorAll('button')].find((b) => b.textContent === 'Lock it in')!);
    expect(fig.node.textContent).toMatch(/a voltage gain of 4\.\d/);
    set(fig.node.querySelector('input')!, 1);
    await expect(fig.done).resolves.toBeUndefined();
    expect(fig.node.textContent).toContain('so the peaks clip');
  });

  it('keeps the wiggle through a follower', async () => {
    const fig = FIGURES.follower(ctx(), 'both');
    expect(fig.node.textContent).toMatch(/only 9\d\.\d mV/);
    click(chip(fig.node, 'Through a follower'));
    await expect(fig.done).resolves.toBeUndefined();
  });

  it('sets a gain of eleven with feedback', async () => {
    const fig = FIGURES['opamp-gain'](ctx(), 'ten');
    click(chip(fig.node, 'Rf 10 kΩ'));
    await expect(fig.done).resolves.toBeUndefined();
    click(chip(fig.node, 'Rf 100 kΩ'));
    expect(fig.node.textContent).toContain('clips hard');
  });
});

describe('lesson 10', () => {
  const click = (el: Element) => el.dispatchEvent(new Event('click', { bubbles: true }));
  const button = (node: HTMLElement, text: string) => [...node.querySelectorAll('button')].find((b) => b.textContent === text)!;

  it('finds the base on the board', async () => {
    const fig = FIGURES['two-views'](ctx(), 'match');
    click([...fig.node.querySelectorAll('.chip')].find((c) => c.textContent === 'Board')!);
    const hits = [...fig.node.querySelectorAll('.board polyline[stroke="transparent"]')];
    for (const h of hits) click(h);
    await expect(fig.done).resolves.toBeUndefined();
    expect(fig.node.textContent).toContain("That's the base");
  });

  for (const id of ['dead-led', 'wrong-rc', 'dry-joint'] as const) {
    it(`marks the fault on the ${id} board`, async () => {
      const fig = FIGURES[id](ctx(), 'find');
      const hits = [...fig.node.querySelectorAll('polyline[stroke="transparent"]')];
      for (const h of hits) {
        if (fig.node.textContent?.includes('Found it')) break;
        click(button(fig.node, 'Mark the fault'));
        click(h);
      }
      await expect(fig.done).resolves.toBeUndefined();
    });
  }
});
