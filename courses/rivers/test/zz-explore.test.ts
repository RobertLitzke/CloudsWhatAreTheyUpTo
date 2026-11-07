// @vitest-environment happy-dom
import { it } from 'vitest';
import { writeFileSync } from 'fs';
import { history, GAIN, START } from '../src/figures/meanders';
it('svg', () => {
  GAIN.k = Number(process.env.K ?? 2.5); GAIN.reach = Number(process.env.R ?? 1.5); START.wave = Number(process.env.WV ?? 150);
  const h = history(Number(process.env.B ?? 1));
  const years = (process.env.Y ?? "0,100,150,180,200,210,250,300,350,400").split(",").map(Number);
  const rows = years.map((y, r) => `<g transform="translate(0 ${r * 250})"><rect width="400" height="240" fill="#eee"/><text x="5" y="14">${y} ox ${h[y].oxbows.length}</text><path d="${h[y].x.map((v, i) => `${i ? 'L' : 'M'}${v},${h[y].y[i]}`).join(' ')}" fill="none" stroke="blue" stroke-width="8"/>${h[y].oxbows.map((o) => `<path d="${o.x.map((v, i) => `${i ? 'L' : 'M'}${v},${o.y[i]}`).join(' ')}" fill="none" stroke="green" stroke-width="5"/>`).join('')}</g>`);
  writeFileSync(process.env.OUT!, `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="${years.length * 250}">${rows.join('')}</svg>`);
});
