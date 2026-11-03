"""Cut a stage's pictures out of the white backgrounds an image model gives.

    pip install numpy scipy pillow
    python tools/stage/cutout.py <folder of raw jpgs> public/stage/perched

Reads bird.jpg, bushes.jpg, trees.jpg and hills.jpg (each a sharp picture of
one plane on plain white) and writes <plane>.webp with real transparency:

- background is white that touches the picture's edge, plus any larger patch
  of pure white inside it (sky between leaves);
- the edge is given soft alpha by how far each pixel is from white, and its
  colour is "unmixed" from the white it was blended with, so no pale fringe
  is left to blur into the scene;
- fully transparent pixels take the colour of the nearest solid one, so the
  GPU's smaller copies of the picture (mipmaps) do not darken the edges;
- hills are made opaque: the white under the near ridge is filled downwards
  with the ridge's own colours. Trees and bushes get extra rows below them
  (ground; more bush), since at a short zoom and a far background the frame
  reaches below the bottom of the picture as drawn.
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

SOLID = 14      # this close to white (0-255, the darkest channel's shortfall) is background
EDGE = (10, 70)
GROUND = (138, 128, 92)  # dry meadow under the trees, as in Rob's composite  # alpha ramps from 0 to 1 over this distance from white, at the edge only


def cut(rgb: np.ndarray, holes: int) -> np.ndarray:
    d = (255.0 - rgb).max(axis=2)
    white = d < SOLID
    labels, n = ndimage.label(white)
    border = set(np.unique(np.concatenate([labels[0], labels[-1], labels[:, 0], labels[:, -1]]))) - {0}
    sizes = ndimage.sum(white, labels, range(n + 1))
    bg = np.isin(labels, list(border))
    bg |= (sizes[labels] > holes) & white
    near = ndimage.binary_dilation(bg, iterations=3) & ~bg
    alpha = np.ones(d.shape)
    alpha[bg] = 0
    ramp = np.clip((d - EDGE[0]) / (EDGE[1] - EDGE[0]), 0, 1)
    alpha[near] = ramp[near]
    # Unmix the edge from white: c = a*fg + (1-a)*255.
    a = alpha[..., None]
    fg = np.where(a > 0.02, (rgb - (1 - a) * 255) / np.maximum(a, 0.02), rgb)
    fg = np.clip(fg, 0, 255)
    # Transparent pixels take the nearest solid pixel's colour.
    solid = alpha > 0.5
    if solid.any() and (~solid).any():
        _, (iy, ix) = ndimage.distance_transform_edt(~solid, return_indices=True)
        fg = np.where(solid[..., None], fg, fg[iy, ix])
    return np.dstack([fg, alpha * 255]).astype(np.uint8)


def fill_down(rgba: np.ndarray) -> np.ndarray:
    """Make it opaque: under the near ridge, meadow (the trees' plane hides most of it)."""
    out = rgba.copy()
    h = out.shape[0]
    a = out[..., 3] > 127
    for x in range(out.shape[1]):
        rows = np.nonzero(a[:, x])[0]
        if not len(rows):
            continue
        last = rows.max()
        if last < h - 1:
            out[last + 1:, x, :3] = GROUND
    grain = np.random.default_rng(2).normal(0, 6, out.shape[:2] + (1,))
    out[..., :3] = np.where(a[..., None], out[..., :3], np.clip(out[..., :3] + grain, 0, 255)).astype(np.uint8)
    out[..., 3] = 255
    return out


def ground_below(rgba: np.ndarray, rows: int) -> np.ndarray:
    """The trees' ground carried on down: transparent ground filled and `rows` more added, a dry meadow's colour with a little grain."""
    h, w = rgba.shape[:2]
    a = rgba[..., 3] > 127
    bottom = max(np.nonzero(a.any(axis=1))[0])
    colour = np.array(GROUND, float)
    rng = np.random.default_rng(1)
    extra = np.zeros((rows, w, 4), np.uint8)
    out = np.concatenate([rgba, extra])
    region = np.zeros(out.shape[:2], bool)
    region[h:] = True
    # Below each tree's base, where the picture went white again.
    for x in range(w):
        col = np.nonzero(a[:, x])[0]
        if len(col):
            region[col.max() + 1:, x] = True
    noise = rng.normal(0, 7, out.shape[:2] + (1,))
    grass = np.clip(colour + noise, 0, 255)
    out[..., :3] = np.where(region[..., None], grass, out[..., :3])
    out[..., 3] = np.where(region, 255, out[..., 3])
    return out


def more_bush(rgba: np.ndarray, rows: int) -> np.ndarray:
    """More of the bush below it: its lower part again, mirrored, so the leaves carry on."""
    return np.concatenate([rgba, rgba[::-1][:rows]])


def main(src: str, dst: str) -> None:
    out = Path(dst)
    out.mkdir(parents=True, exist_ok=True)
    for name in ['bird', 'bushes', 'trees', 'hills']:
        rgb = np.asarray(Image.open(Path(src) / f'{name}.jpg').convert('RGB')).astype(float)
        # White patches inside the outline: sky between leaves, or between the
        # dead tree's branches; on the bird's branch small ones are pale bark.
        rgba = cut(rgb, holes=40 if name in ('bushes', 'trees') else 400)
        if name == 'hills':
            rgba = fill_down(rgba)
        elif name == 'trees':
            rgba = ground_below(rgba, rows=rgba.shape[0] // 3)
        elif name == 'bushes':
            rgba = more_bush(rgba, rows=rgba.shape[0] // 2)
        Image.fromarray(rgba, 'RGBA').save(out / f'{name}.webp', quality=86, method=6)
        print(name, rgba.shape[1], 'x', rgba.shape[0])


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
