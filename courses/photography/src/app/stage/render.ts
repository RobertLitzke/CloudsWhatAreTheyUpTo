// Drawing a stage: each plane laid down farthest first, blurred by its own
// blur circle. WebGL 2 where there is one, so the blur can be the lens's real
// shape (a disc: every point of light spreads evenly over a circle, which is
// why bright glints come out as round "bokeh" balls); a 2D canvas with the
// browser's Gaussian blur otherwise.
//
// The blur is done in linear light, where light adds up as it does on a
// sensor, and bright highlights are given a little more weight than an 8-bit
// picture can hold, so a glint spreads into a disc rather than a smudge.
// Each plane's picture is premultiplied by its alpha, so a cut-out's soft
// edge blurs into what is behind it instead of leaving a pale rim.

import type { Placed } from '../../core/stage';

/** A plane's picture, ready to draw. */
export type Picture = HTMLImageElement | HTMLCanvasElement;

export interface StageRenderer {
  /** Draw these placed planes; each needs its picture in `pictures` by plane id, or it is skipped. */
  draw: (placed: Placed[], pictures: ReadonlyMap<string, Picture>) => void;
  /** 'disc' with WebGL, 'gaussian' on a 2D canvas, 'none' when the browser offers neither (tests). */
  kind: 'disc' | 'gaussian' | 'none';
}

const BACKGROUND = '#dfe8e8';

/** A renderer for `canvas`: WebGL 2 if it can, else 2D. */
export function stageRenderer(canvas: HTMLCanvasElement): StageRenderer {
  let gl: WebGL2RenderingContext | null = null;
  try {
    gl = canvas.getContext('webgl2', { premultipliedAlpha: true, antialias: false, preserveDrawingBuffer: true });
  } catch {
    gl = null;
  }
  if (gl) {
    const r = discRenderer(gl, canvas);
    if (r) return r;
  }
  return gaussianRenderer(canvas);
}

/** Where a plane goes on the canvas, in pixels: its picture's rectangle. */
function rect(p: Placed, w: number, h: number) {
  return {
    x0: w / 2 + p.left * w,
    x1: w / 2 + p.right * w,
    y0: h / 2 - p.top * w,
    y1: h / 2 - p.bottom * w,
  };
}

// ---- 2D fallback ---------------------------------------------------------------

function gaussianRenderer(canvas: HTMLCanvasElement): StageRenderer {
  let ctx: CanvasRenderingContext2D | null = null;
  try {
    ctx = canvas.getContext('2d');
  } catch {
    ctx = null;
  }
  if (!ctx) return { kind: 'none', draw: () => {} };
  const g = ctx;
  return {
    kind: 'gaussian',
    draw: (placed, pictures) => {
      const w = canvas.width;
      const h = canvas.height;
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.filter = 'none';
      g.fillStyle = BACKGROUND;
      g.fillRect(0, 0, w, h);
      for (const p of placed) {
        const pic = pictures.get(p.plane.id);
        if (!pic) continue;
        const r = rect(p, w, h);
        // A disc of diameter d spreads light with a standard deviation of d/4
        // in each direction; a Gaussian with that sigma spreads it as far.
        const sigma = (p.blur * w) / 4;
        g.filter = sigma > 0.3 ? `blur(${sigma.toFixed(2)}px)` : 'none';
        const copies = p.plane.tile ? p.plane.width / p.plane.tile : 1;
        const cw = (r.x1 - r.x0) / copies;
        for (let k = 0; k < copies; k++) {
          const x = r.x0 + k * cw;
          if (x + cw < -sigma * 3 || x > w + sigma * 3) continue;
          g.drawImage(pic, x, r.y0, cw, r.y1 - r.y0);
        }
      }
      g.filter = 'none';
    },
  };
}

// ---- WebGL: a disc blur ------------------------------------------------------------

/** Taps in the disc, laid on a golden-angle spiral so they cover it evenly. */
const TAPS = 64;

const VERT = `#version 300 es
in vec2 corner;
uniform vec4 rect;   // x0, y0, x1, y1 in clip space
uniform vec4 uvs;    // u0, v0, u1, v1
out vec2 uv;
void main() {
  uv = mix(uvs.xy, uvs.zw, corner);
  gl_Position = vec4(mix(rect.xy, rect.zw, corner), 0.0, 1.0);
}`;

const FRAG = `#version 300 es
precision highp float;
in vec2 uv;
uniform sampler2D picture;
uniform vec2 radius;   // the blur circle's radius, in the picture's uv
uniform float lod;     // which mip level to read: wider taps read a smoother level
uniform float clampEdges;
uniform float repeats; // copies of the picture across the plane; 1 for a single picture
uniform float glow;    // how much extra weight highlights get, 0 when sharp
out vec4 colour;

vec3 toLinear(vec3 c) { return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c)); }
vec3 toSrgb(vec3 c) { return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }

void main() {
  vec4 sum = vec4(0.0);
  for (int i = 0; i < ${TAPS}; i++) {
    float r = sqrt((float(i) + 0.5) / float(${TAPS}));
    float a = float(i) * 2.39996323;
    vec2 p = uv + radius * r * vec2(cos(a), sin(a));
    float inside = clampEdges > 0.5 ? 1.0 : step(0.0, p.x) * step(p.x, 1.0) * step(0.0, p.y) * step(p.y, 1.0);
    vec2 q = clamp(p, 0.0, 1.0);
    q.x *= repeats; // the wrap mode mirrors each copy, so the joins match
    vec4 s = textureLod(picture, q, lod) * inside;
    if (s.a > 0.0) {
      vec3 lin = toLinear(s.rgb / s.a);
      float lum = dot(lin, vec3(0.2126, 0.7152, 0.0722));
      lin *= 1.0 + glow * smoothstep(0.8, 1.0, lum);
      sum += vec4(lin * s.a, s.a);
    }
  }
  sum /= float(${TAPS});
  vec3 c = sum.a > 0.0 ? toSrgb(min(sum.rgb / sum.a, vec3(1.0))) : vec3(0.0);
  colour = vec4(c * sum.a, sum.a);
}`;

function compile(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader | null {
  const s = gl.createShader(type);
  if (!s) return null;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    console.warn(gl.getShaderInfoLog(s));
    return null;
  }
  return s;
}

function discRenderer(gl: WebGL2RenderingContext, canvas: HTMLCanvasElement): StageRenderer | null {
  const vs = compile(gl, gl.VERTEX_SHADER, VERT);
  const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
  const prog = gl.createProgram();
  if (!vs || !fs || !prog) return null;
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  const loc = gl.getAttribLocation(prog, 'corner');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const u = (name: string) => gl.getUniformLocation(prog, name);
  const U = { rect: u('rect'), uvs: u('uvs'), radius: u('radius'), lod: u('lod'), clampEdges: u('clampEdges'), glow: u('glow'), picture: u('picture'), repeats: u('repeats') };

  const textures = new Map<Picture, { tex: WebGLTexture; w: number; h: number }>();
  const textureFor = (pic: Picture) => {
    const got = textures.get(pic);
    if (got) return got;
    const tex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, pic);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const w = pic instanceof HTMLImageElement ? pic.naturalWidth : pic.width;
    const h = pic instanceof HTMLImageElement ? pic.naturalHeight : pic.height;
    const t = { tex, w, h };
    textures.set(pic, t);
    return t;
  };

  const bg = [0xdf / 255, 0xe8 / 255, 0xe8 / 255];

  return {
    kind: 'disc',
    draw: (placed, pictures) => {
      const W = canvas.width;
      const H = canvas.height;
      gl.viewport(0, 0, W, H);
      gl.clearColor(bg[0], bg[1], bg[2], 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(prog);
      gl.bindVertexArray(vao);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.activeTexture(gl.TEXTURE0);
      gl.uniform1i(U.picture, 0);

      for (const p of placed) {
        const pic = pictures.get(p.plane.id);
        if (!pic) continue;
        const t = textureFor(pic);
        const r = rect(p, W, H);
        const pw = r.x1 - r.x0;
        const ph = r.y1 - r.y0;
        // The blur's radius on the canvas; the quad grows by it so the blur can spill past the picture's edge.
        const R = (p.blur * W) / 2;
        const pad = p.plane.backdrop ? 0 : R;
        // Draw only what can reach the canvas: a plane can be many canvases wide.
        const x0 = Math.max(r.x0 - pad, -1);
        const x1 = Math.min(r.x1 + pad, W + 1);
        const y0 = Math.max(r.y0 - pad, -1);
        const y1 = Math.min(r.y1 + pad, H + 1);
        if (x1 <= x0 || y1 <= y0) continue;
        const toU = (x: number) => (x - r.x0) / pw;
        const toV = (y: number) => (y - r.y0) / ph;
        gl.uniform4f(U.rect, (x0 / W) * 2 - 1, 1 - (y0 / H) * 2, (x1 / W) * 2 - 1, 1 - (y1 / H) * 2);
        gl.uniform4f(U.uvs, toU(x0), toV(y0), toU(x1), toV(y1));
        gl.uniform2f(U.radius, R / pw, R / ph);
        // How many of the picture's pixels fall in one canvas pixel, and how far apart the taps are.
        const repeats = p.plane.tile ? p.plane.width / p.plane.tile : 1;
        const texelsPerPixel = (t.w * repeats) / pw;
        const gap = Math.max(1, R * Math.sqrt(Math.PI / TAPS));
        gl.uniform1f(U.lod, Math.max(0, Math.log2(Math.max(1e-6, texelsPerPixel * gap))));
        gl.uniform1f(U.clampEdges, p.plane.backdrop ? 1 : 0);
        gl.uniform1f(U.glow, Math.min(1, R / 6) * 3);
        gl.uniform1f(U.repeats, repeats);
        gl.bindTexture(gl.TEXTURE_2D, t.tex);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, repeats > 1 ? gl.MIRRORED_REPEAT : gl.CLAMP_TO_EDGE);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      }
    },
  };
}
