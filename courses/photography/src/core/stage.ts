// A stage: a scene built from flat, fully sharp pictures ("planes"), each
// standing at a real distance from the camera. The depth-of-field figure takes
// its photograph of a stage rather than of a real photo, because a real photo
// already carries its own lens's blur, which can be added to but never taken
// away, and has nothing behind its subject to show once the subject's edge
// softens.
//
// This file is the geometry, pure and unit-tested: where each plane lands in
// the frame and how wide a blur circle each one gets. The pictures themselves
// and the drawing are app/stage/.
//
// The camera looks straight down the axis through the subject. A plane `d`
// metres away is magnified by f / (d − f) (thin lens), so its width on the
// sensor is its real width times that; dividing by the sensor's width gives
// the share of the frame it covers. Far planes are magnified less: that is
// why stepping back and zooming in makes the background look bigger behind a
// subject kept the same size.

import { P950, type Camera, blurCircle, diffraction } from './camera';

/** One flat picture in the scene. Lengths in metres. */
export interface Plane {
  /** The picture's name: `<id>.webp` in the stage's folder, or a placeholder drawn in the app. */
  id: string;
  /** Metres behind the subject (negative: in front of it). The subject's own plane is 0. */
  behind: number;
  /** How wide the picture is in the world, metres. */
  width: number;
  /** How tall, metres; the picture's own proportions when it is loaded. */
  height: number;
  /** Where the picture's bottom edge is, metres above (+) or below (−) the camera's axis. */
  bottom: number;
  /** Where its middle is, metres right of the axis. */
  x?: number;
  /**
   * Metres of the world one copy of the picture covers, when the picture
   * repeats across the plane's width (mirrored each time, so no seam shows).
   * Bushes and trees repeat: a long lens sees a metre of a bush close up,
   * and one picture could not be both that sharp and fourteen metres wide.
   */
  tile?: number;
  /** A backdrop always reaches the frame's edges: its picture is clamped there rather than cut off. */
  backdrop?: boolean;
  /** The plane the figure's "background" slider moves. */
  movable?: boolean;
}

export interface Stage {
  id: string;
  /** How tall the subject is, metres (the bird, not its branch). */
  subjectTall: number;
  /** How much of the frame's height the camera keeps the subject at, 0 to 1. */
  framing: number;
  planes: Plane[];
}

/** Where a plane lands, in fractions of the frame's width from the frame's middle, and how soft. */
export interface Placed {
  plane: Plane;
  /** Metres from the camera. */
  distance: number;
  /** Left, right, top and bottom edges, in frame widths from the frame's middle (y up). */
  left: number;
  right: number;
  top: number;
  bottom: number;
  /** The blur circle's diameter in frame widths: defocus and diffraction together. */
  blur: number;
}

/**
 * How far back the camera stands, metres, so that the subject fills
 * `stage.framing` of the frame's height at `focal` real mm.
 */
export function standFor(stage: Stage, focal: number, cam: Camera = P950): number {
  return focal / 1000 + (stage.subjectTall * focal) / (stage.framing * cam.sensor.h);
}

/** The sensor-side magnification of something `d` metres away at `focal` mm. */
export const magnification = (focal: number, d: number): number => focal / (d * 1000 - focal);

/**
 * Every plane that is in front of the camera, farthest first, placed and
 * given its blur. `stand` is how far the camera is from the subject, `focusAt`
 * the distance the lens is focused at, `n` the f-number; `behind` overrides
 * the movable plane's distance behind the subject.
 */
export function place(
  stage: Stage,
  o: { focal: number; n: number; stand: number; focusAt: number; behind?: number },
  cam: Camera = P950,
): Placed[] {
  const out: Placed[] = [];
  const soft = diffraction(o.n);
  for (const plane of stage.planes) {
    const behind = plane.movable && o.behind !== undefined ? o.behind : plane.behind;
    const distance = o.stand + behind;
    if (distance * 1000 <= o.focal * 1.5) continue;
    const m = magnification(o.focal, distance) * 1000 / cam.sensor.w; // frame widths per metre
    const cx = (plane.x ?? 0) * m;
    const blur = Math.hypot(blurCircle(o.focal, o.n, o.focusAt, distance), soft) / cam.sensor.w;
    out.push({
      plane,
      distance,
      left: cx - (plane.width / 2) * m,
      right: cx + (plane.width / 2) * m,
      bottom: plane.bottom * m,
      top: (plane.bottom + plane.height) * m,
      blur,
    });
  }
  return out.sort((a, b) => b.distance - a.distance);
}

/**
 * The stage the depth-of-field figure starts with: a bird on a branch, bushes
 * behind it, a line of trees and far hills. Sizes are a real songbird's
 * (about 17 cm) and real bushes and trees; the pictures' own proportions
 * replace `height` once they load.
 */
export const PERCHED: Stage = {
  id: 'perched',
  subjectTall: 0.17,
  framing: 0.3,
  planes: [
    { id: 'hills', behind: 4000, width: 2400, height: 900, bottom: -260, backdrop: true },
    { id: 'trees', behind: 80, width: 240, height: 15, bottom: -6, tile: 40 },
    { id: 'bushes', behind: 8, width: 60, height: 3, bottom: -2.2, tile: 4, movable: true },
    { id: 'bird', behind: 0, width: 1.2, height: 0.6, bottom: -0.3 },
  ],
};

/** The range the "bushes behind the bird" slider runs over, metres. */
export const BEHIND_RANGE = { min: 1, max: 40 } as const;
