// Option C: clouds as real volumes, ray-marched on the GPU. Each heap is a
// cluster of spheres eaten into by 3D noise; every pixel looks straight into
// the scene, steps through the cloud, and at each step asks how much cloud lies
// between that point and the sun (Beer's law), with the forward glow of light
// scattered by droplets. The result is graded through the scene palette like
// the others. One WebGL context for the whole app draws a figure's clouds and
// hands them back as an image.

import { svg } from '../../src/app/dom';
import type { Palette } from '../../src/app/scene/landscape';
import { rampOf } from './ramp';
import { SUN, type Cloud } from './scene';

const W = 400;
const H = 260;
const MAX_PUFFS = 120;
const MAX_SEGS = 48;
const MAX_CLOUDS = 8;

const VERT = `#version 300 es
in vec2 pos;
void main() { gl_Position = vec4(pos, 0.0, 1.0); }`;

const FRAG = `#version 300 es
precision highp float;
uniform vec2 uSize;          // canvas pixels
uniform vec4 uPuff[${MAX_PUFFS}];   // x, y, z, r
uniform float uFlat[${MAX_PUFFS}];
uniform vec4 uSeg[${MAX_SEGS}];     // ax, ay, bx, by
uniform vec2 uSegW[${MAX_SEGS}];    // half widths at a and b
uniform vec4 uBox[${MAX_CLOUDS}];   // x0, y0, x1, y1
uniform vec4 uCloud[${MAX_CLOUDS}]; // kind, first, end, depth
uniform vec4 uShape[${MAX_CLOUDS}]; // base, height, detail, unused
uniform int uClouds;
uniform vec3 uSun;           // sun position, scene units (z: towards the viewer)
uniform vec3 uShade, uMid, uLight;
out vec4 frag;

float hash(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
float noise(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash(i), hash(i + vec3(1, 0, 0)), f.x), mix(hash(i + vec3(0, 1, 0)), hash(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(hash(i + vec3(0, 0, 1)), hash(i + vec3(1, 0, 1)), f.x), mix(hash(i + vec3(0, 1, 1)), hash(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}
float fbm(vec3 p, int oct) {
  float s = 0.0, a = 0.5, n = 0.0;
  for (int i = 0; i < 4; i++) {
    if (i >= oct) break;
    s += a * noise(p); n += a;
    p = p * 2.03 + vec3(1.7, 9.2, 5.3);
    a *= 0.5;
  }
  return s / n;
}

const float ROUND = 1.2; // puffs a little fuller in depth than in outline
float density(int c, vec3 p, int oct) {
  vec4 cl = uCloud[c];
  int kind = int(cl.x);
  vec4 sh = uShape[c];
  if (kind == 2) {
    // Cirrus: strands, a few units deep, combed into fibres along their length.
    float best = 0.0;
    for (int i = int(cl.y); i < int(cl.z); i++) {
      vec2 a = uSeg[i].xy, b = uSeg[i].zw;
      vec2 v = b - a;
      float t = clamp(dot(p.xy - a, v) / dot(v, v), 0.0, 1.0);
      float hw = mix(uSegW[i].x, uSegW[i].y, t);
      best = max(best, 1.0 - length(p.xy - a - v * t) / (hw * 1.8));
    }
    if (best <= 0.0) return 0.0;
    float fib = fbm(vec3(p.x / 26.0 + p.y * 0.15, p.y / 1.3, p.z / 3.0), oct);
    float depthFade = 1.0 - smoothstep(1.5, 4.0, abs(p.z));
    return clamp(best * 1.4, 0.0, 1.0) * smoothstep(0.38, 0.72, fib) * depthFade * 0.6;
  }
  if (kind == 0 && p.y > sh.x) return 0.0;
  float s = -1.0;
  for (int i = int(cl.y); i < int(cl.z); i++) {
    vec4 q = uPuff[i];
    vec3 d = (p - q.xyz) / vec3(q.w, q.w * uFlat[i], q.w);
    s = max(s, 1.0 - length(d) / ROUND);
  }
  if (s < -0.4) return 0.0;
  float n = fbm(p / sh.z, oct);
  float d = clamp((s - 0.5 * (1.0 - n) + 0.2) * 2.5, 0.0, 1.0);
  if (kind == 0) d *= clamp((sh.x - p.y) / 1.0, 0.0, 1.0);
  return d;
}

void main() {
  vec2 xy = vec2(gl_FragCoord.x, uSize.y - gl_FragCoord.y) / uSize * vec2(${W}.0, ${H}.0);
  float L = 0.0;     // light gathered, 0..1 scale
  float T = 1.0;     // how much of what is behind still shows
  for (int c = 0; c < ${MAX_CLOUDS}; c++) {
    if (c >= uClouds) break;
    vec4 b = uBox[c];
    if (xy.x < b.x || xy.x > b.z || xy.y < b.y || xy.y > b.w) continue;
    // Clouds are listed farthest first; march this one and lay it over what is behind.
    float depth = uCloud[c].w;
    int kind = int(uCloud[c].x);
    float sigma = kind == 2 ? 0.35 : 0.55;
    const int STEPS = 40;
    float dz = 2.0 * depth / float(STEPS);
    float cl = 0.0, ct = 1.0;
    vec3 centre = vec3((b.x + b.z) * 0.5, (b.y + b.w) * 0.5, 0.0);
    vec3 toSun = normalize(uSun - centre);
    float lstep = max(1.0, uShape[c].y * 0.07);
    for (int k = 0; k < STEPS; k++) {
      vec3 p = vec3(xy, -depth + (float(k) + 0.5) * dz);
      float d = density(c, p, 3);
      if (d < 0.01) continue;
      // Cloud between this point and the sun.
      float od = 0.0;
      for (int j = 1; j <= 5; j++) od += density(c, p + toSun * lstep * float(j), 2);
      float tl = exp(-od * lstep * sigma * 1.8);
      float powder = 1.0 - exp(-d * 4.0);
      // Brighter higher up, darker towards a heap's base.
      float lift = kind == 0 ? clamp((uShape[c].x - p.y) / (uShape[c].y * 0.55), 0.0, 1.0) : 0.8;
      float li = tl * mix(0.5, 1.0, powder) * (0.75 + 0.25 * lift) + 0.06 + 0.22 * lift;
      if (kind == 2) li = 0.9;
      float a = 1.0 - exp(-d * sigma * dz);
      cl += ct * a * li;
      ct *= 1.0 - a;
      if (ct < 0.02) break;
    }
    L = cl + L * ct;
    T *= ct;
  }
  float alpha = 1.0 - T;
  if (alpha < 0.003) { frag = vec4(0.0); return; }
  float l = clamp(L / alpha * 0.95, 0.0, 1.0);
  vec3 col = l < 0.5 ? mix(uShade, uMid, smoothstep(0.0, 1.0, l * 2.0)) : mix(uMid, uLight, smoothstep(0.0, 1.0, l * 2.0 - 1.0));
  frag = vec4(col * alpha, alpha);
}`;

let gl: WebGL2RenderingContext | null = null;
let prog: WebGLProgram | null = null;

function setup(w: number, h: number): WebGL2RenderingContext {
  if (!gl) {
    const canvas = document.createElement('canvas');
    gl = canvas.getContext('webgl2', { premultipliedAlpha: true, preserveDrawingBuffer: true })!;
    if (!gl) throw new Error('no WebGL2');
    const sh = (type: number, src: string) => {
      const s = gl!.createShader(type)!;
      gl!.shaderSource(s, src);
      gl!.compileShader(s);
      if (!gl!.getShaderParameter(s, gl!.COMPILE_STATUS)) throw new Error(gl!.getShaderInfoLog(s) ?? 'shader');
      return s;
    };
    prog = gl.createProgram()!;
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) ?? 'link');
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'pos');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  }
  gl.canvas.width = w;
  gl.canvas.height = h;
  gl.viewport(0, 0, w, h);
  return gl;
}

/** The clouds as one image to lay over a scene's sky, and how long they took. */
export function marchClouds(clouds: Cloud[], p: Palette, scale = 3): { node: SVGElement; ms: number } {
  const t0 = performance.now();
  const cw = W * scale;
  const ch = H * scale;
  const g = setup(cw, ch);
  const puff = new Float32Array(MAX_PUFFS * 4);
  const flat = new Float32Array(MAX_PUFFS);
  const seg = new Float32Array(MAX_SEGS * 4);
  const segW = new Float32Array(MAX_SEGS * 2);
  const box = new Float32Array(MAX_CLOUDS * 4);
  const info = new Float32Array(MAX_CLOUDS * 4);
  const shape = new Float32Array(MAX_CLOUDS * 4);
  let np = 0;
  let ns = 0;
  clouds.forEach((c, i) => {
    if (c.kind === 'cirrus') {
      const first = ns;
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (const s of c.strands) {
        // Every other point is plenty for the GPU.
        const pts = s.pts.filter((_, k) => k % 2 === 0);
        for (let k = 1; k < pts.length && ns < MAX_SEGS; k++, ns++) {
          seg.set([pts[k - 1][0], pts[k - 1][1], pts[k][0], pts[k][1]], ns * 4);
          segW.set([pts[k - 1][2], pts[k][2]], ns * 2);
        }
        for (const [x, y] of s.pts) {
          x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
        }
      }
      box.set([x0 - 8, y0 - 8, x1 + 8, y1 + 8], i * 4);
      info.set([2, first, ns, 5], i * 4);
      shape.set([0, 10, 4, 0], i * 4);
      return;
    }
    const first = np;
    for (const q of c.puffs) {
      if (np >= MAX_PUFFS) break;
      puff.set([q.x, q.y, q.z, q.r], np * 4);
      flat[np++] = q.flat;
    }
    if (c.kind === 'heap') {
      box.set([c.cx - c.w * 0.75, c.base - c.h * 1.3, c.cx + c.w * 0.75, c.base + 1], i * 4);
      info.set([0, first, np, c.w * 0.45], i * 4);
      shape.set([c.base, c.h, Math.max(2.5, c.h * 0.15), 0], i * 4);
    } else {
      box.set([c.x0 - 10, c.top - 10, c.x1 + 10, c.bottom + 10], i * 4);
      info.set([1, first, np, 9], i * 4);
      shape.set([0, 6, 2.2, 0], i * 4);
    }
  });
  const u = (n: string) => g.getUniformLocation(prog!, n);
  g.useProgram(prog);
  g.uniform2f(u('uSize'), cw, ch);
  g.uniform4fv(u('uPuff'), puff);
  g.uniform1fv(u('uFlat'), flat);
  g.uniform4fv(u('uSeg'), seg);
  g.uniform2fv(u('uSegW'), segW);
  g.uniform4fv(u('uBox'), box);
  g.uniform4fv(u('uCloud'), info);
  g.uniform4fv(u('uShape'), shape);
  g.uniform1i(u('uClouds'), clouds.length);
  g.uniform3f(u('uSun'), SUN[0], SUN[1], -40);
  const r = rampOf(p);
  g.uniform3fv(u('uShade'), r.shade.map((v) => v / 255));
  g.uniform3fv(u('uMid'), r.mid.map((v) => v / 255));
  g.uniform3fv(u('uLight'), r.light.map((v) => v / 255));
  g.clearColor(0, 0, 0, 0);
  g.clear(g.COLOR_BUFFER_BIT);
  g.drawArrays(g.TRIANGLES, 0, 3);
  // Wait for the GPU, so the timing is honest.
  g.readPixels(0, 0, 1, 1, g.RGBA, g.UNSIGNED_BYTE, new Uint8Array(4));
  const out = document.createElement('canvas');
  out.width = cw;
  out.height = ch;
  out.getContext('2d')!.drawImage(g.canvas as HTMLCanvasElement, 0, 0);
  const ms = performance.now() - t0;
  return { node: svg('image', { href: out.toDataURL(), x: 0, y: 0, width: W, height: H }), ms };
}
