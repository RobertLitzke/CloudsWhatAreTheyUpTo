// Oscilloscope and spectrum on one canvas.
//
// Shown in lessons, in free play and after a puzzle is committed. Never during a
// puzzle: with it on, the puzzle becomes matching two pictures.

import { el } from '../dom';

export interface Scope {
  el: HTMLElement;
  start(analyser: AnalyserNode): void;
  stop(): void;
}

export function createScope(): Scope {
  const canvas = el('canvas.scope-canvas') as HTMLCanvasElement;
  const root = el('div.scope', {}, canvas);
  let frame = 0;

  const start = (analyser: AnalyserNode) => {
    cancelAnimationFrame(frame);
    const g = canvas.getContext('2d');
    if (!g) return;
    const wave = new Float32Array(analyser.fftSize);
    const spectrum = new Uint8Array(analyser.frequencyBinCount);
    const css = getComputedStyle(root);
    const line = css.getPropertyValue('--cyan').trim() || '#9FE8F5';
    const dim = css.getPropertyValue('--hair-dim').trim() || '#28324a';
    const nyquist = analyser.context.sampleRate / 2;

    const draw = () => {
      frame = requestAnimationFrame(draw);
      const ratio = window.devicePixelRatio || 1;
      const w = Math.round(canvas.clientWidth * ratio);
      const h = Math.round(canvas.clientHeight * ratio);
      if (w === 0 || h === 0) return;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      g.clearRect(0, 0, w, h);
      const split = Math.round(w * 0.5);

      // Waveform, left: start at a rising zero crossing so it stands still.
      analyser.getFloatTimeDomainData(wave);
      let from = 0;
      for (let i = 1; i < wave.length / 2; i++) {
        if (wave[i - 1] < 0 && wave[i] >= 0) {
          from = i;
          break;
        }
      }
      const span = wave.length / 2;
      g.strokeStyle = dim;
      g.lineWidth = ratio;
      g.beginPath();
      g.moveTo(0, h / 2);
      g.lineTo(split - 8 * ratio, h / 2);
      g.stroke();
      g.strokeStyle = line;
      g.lineWidth = 1.5 * ratio;
      g.beginPath();
      for (let i = 0; i < span; i++) {
        const x = (i / span) * (split - 8 * ratio);
        const y = h / 2 - wave[from + i] * h * 0.9;
        if (i === 0) g.moveTo(x, y);
        else g.lineTo(x, y);
      }
      g.stroke();

      // Spectrum, right: 50 Hz to 12 kHz on a log axis.
      analyser.getByteFrequencyData(spectrum);
      const bars = 56;
      const left = split + 8 * ratio;
      const barW = (w - left) / bars;
      g.fillStyle = line;
      for (let b = 0; b < bars; b++) {
        const f0 = 50 * Math.pow(240, b / bars);
        const f1 = 50 * Math.pow(240, (b + 1) / bars);
        const i0 = Math.floor((f0 / nyquist) * spectrum.length);
        const i1 = Math.max(i0 + 1, Math.ceil((f1 / nyquist) * spectrum.length));
        let peak = 0;
        for (let i = i0; i < i1 && i < spectrum.length; i++) peak = Math.max(peak, spectrum[i]);
        const barH = Math.max(ratio, (peak / 255) * h);
        g.fillRect(left + b * barW, h - barH, Math.max(1, barW - ratio), barH);
      }
    };
    draw();
  };

  return {
    el: root,
    start,
    stop() {
      cancelAnimationFrame(frame);
    },
  };
}
