"""Writes courses/geology/src/data/paleomap.json: the continents from a billion
years ago to today, and 50 million years ahead if today's motions held, for
the supercontinents figure (Geology lesson on the supercontinent cycle).

Source: the PALEOMAP plate model by C. R. Scotese (2016), as shipped with the
GPlates pygplates tutorials (github.com/GPlates/pygplates-tutorials, data/,
CC BY 3.0): PALEOMAP_PlateModel.rot, PALEOMAP_coastlines.gpmlz and
PALEOMAP_PlatePolygons.gpmlz. EarthByte's own servers are not reachable from
the cloud build machine; GitHub is.

Usage (pygplates from PyPI):
  git clone --depth 1 https://github.com/GPlates/pygplates-tutorials
  python3 -I tools/geo/paleomap.py pygplates-tutorials/data courses/geology/src/data/paleomap.json

Output: present-day outlines (land = coastlines, shelf = continental crust),
each with the plate that carries it and the age it appears from, simplified;
for every plate used, one rotation (a unit quaternion w, x, y, z) per frame
that carries a present-day point to where it was. Frame i is age
FUTURE + ... : ages run from -50 (50 Myr ahead) to 1000 Ma in STEP steps.
"""

import json
import math
import sys

import pygplates

src, out = sys.argv[1], sys.argv[2]
STEP = 10
OLDEST = 1000
AHEAD = 50
AGES = list(range(-AHEAD, OLDEST + 1, STEP))
TOL = 0.35          # simplification, degrees
MIN_AREA = {'land': 1.5, 'shelf': 4.0}  # square degrees (at the equator)

rot = pygplates.RotationModel(src + '/PALEOMAP_PlateModel.rot')


def simplify(pts, tol):
    """Douglas-Peucker on unit vectors (chord distance, about radians)."""
    if len(pts) < 3:
        return pts

    def dist(p, a, b):
        ab = [b[i] - a[i] for i in range(3)]
        ap = [p[i] - a[i] for i in range(3)]
        n = sum(c * c for c in ab)
        k = max(0.0, min(1.0, sum(ab[i] * ap[i] for i in range(3)) / n)) if n else 0.0
        return math.dist(p, [a[i] + k * ab[i] for i in range(3)])

    keep = [False] * len(pts)
    keep[0] = keep[-1] = True
    stack = [(0, len(pts) - 1)]
    while stack:
        i, j = stack.pop()
        best, at = 0.0, -1
        for k in range(i + 1, j):
            d = dist(pts[k], pts[i], pts[j])
            if d > best:
                best, at = d, k
        if best > tol:
            keep[at] = True
            stack += [(i, at), (at, j)]
    return [p for p, k in zip(pts, keep) if k]


def rings(fc, kind):
    """Present-day polygons of continental features: (plate, appears, [[lon, lat]...])."""
    for f in fc:
        begin, _end = f.get_valid_time()
        if begin <= 0:          # present-day-only features: the ocean plates
            continue
        pid = f.get_reconstruction_plate_id()
        for g in f.get_geometries():
            if not isinstance(g, pygplates.PolygonOnSphere):
                continue
            area = g.get_area() * (180 / math.pi) ** 2   # square degrees
            if area < MIN_AREA[kind]:
                continue
            # Drop the seam a ring was cut along (the dateline down to the pole), so a ring round a pole is a plain loop.
            pts = [list(p.to_xyz()) for p in g.get_exterior_ring_points()
                   if abs(p.to_lat_lon()[1]) < 179.95 and abs(p.to_lat_lon()[0]) < 89.9]
            if len(pts) < 4:
                continue
            # Split the closed ring in two at its farthest point, so DP has two open runs.
            far = max(range(len(pts)), key=lambda i: math.dist(pts[0], pts[i]))
            a = simplify(pts[:far + 1], math.radians(TOL))
            b = simplify(pts[far:] + [pts[0]], math.radians(TOL))
            ring = a[:-1] + b[:-1]
            if len(ring) < 4:
                continue
            out = []
            for x, y, z in ring:
                lat = math.degrees(math.asin(max(-1, min(1, z))))
                lon = math.degrees(math.atan2(y, x))
                out.append([round(lon, 2), round(lat, 2)])
            yield {'p': pid, 'from': min(begin, 4500), 'ring': out}


coast = pygplates.FeatureCollection(src + '/PALEOMAP_coastlines.gpmlz')
polys = pygplates.FeatureCollection(src + '/PALEOMAP_PlatePolygons.gpmlz')
land = list(rings(coast, 'land'))
shelf = list(rings(polys, 'shelf'))

# Label anchors: a present-day point, carried by the plate under it.
ANCHORS = {
    'laurentia': (-100, 55), 'baltica': (30, 60), 'siberia': (105, 63), 'africa': (20, 5),
    'samerica': (-58, -12), 'antarctica': (60, -78), 'australia': (134, -25), 'india': (78, 20),
    'china': (110, 33), 'europe': (8, 48), 'arabia': (45, 23), 'greenland': (-40, 72),
    # mountain belts and joins, for markers
    'appalachians': (-80, 37), 'caledonides': (-5, 57), 'norway': (9, 62), 'grenville': (-76, 45),
    'urals': (60, 58), 'himalaya': (85, 29), 'alps': (10, 46.5), 'atlas': (-6, 31),
    'cape': (21, -33.5), 'ventana': (-61.9, -38), 'newfoundland_w': (-57.5, 49), 'newfoundland_e': (-53.5, 47.5),
    'wales': (-3.7, 52.5), 'nw_scotland': (-5.2, 58), 'boston': (-71, 42.3), 'drake_sa': (-68, -55), 'drake_an': (-60, -64),
    'siberian_traps': (95, 65), 'scania': (13.5, 55.9), 'morocco': (-6, 30.5), 'gros_morne': (-58, 49.5), 'panama': (-80, 8.5), 'red_sea': (38, 20), 'east_africa': (36, -3),
}
part = pygplates.PlatePartitioner(polys, rot, 0.0)
anchors = {}
for name, (lon, lat) in ANCHORS.items():
    plate = part.partition_point(pygplates.PointOnSphere(lat, lon))
    pid = plate.get_feature().get_reconstruction_plate_id() if plate else 0
    anchors[name] = {'p': pid, 'lon': lon, 'lat': lat}

used = sorted({r['p'] for r in land + shelf} | {a['p'] for a in anchors.values()})


def quat(fr):
    lat, lon, ang = fr.get_lat_lon_euler_pole_and_angle_degrees()
    la, lo, a = map(math.radians, (lat, lon, ang))
    s = math.sin(a / 2)
    return [math.cos(a / 2), s * math.cos(la) * math.cos(lo), s * math.cos(la) * math.sin(lo), s * math.sin(la)]


def at(pid, age):
    if age >= 0:
        fr = rot.get_rotation(float(age), pid)
        if fr.represents_identity_rotation():
            return [1, 0, 0, 0]
        return quat(fr)
    # Ahead: today's motion, the last 10 Myr reversed, held steady.
    fr = rot.get_rotation(10.0, pid)
    if fr.represents_identity_rotation():
        return [1, 0, 0, 0]
    lat, lon, ang = fr.get_lat_lon_euler_pole_and_angle_degrees()
    return quat(pygplates.FiniteRotation(pygplates.PointOnSphere(lat, lon), math.radians(ang * age / 10.0)))


seqs = []      # unique rotation sequences, delta-encoded
index = {}
plate = {}
for pid in used:
    qs = []
    prev = None
    for age in AGES:
        q = at(pid, age)
        if prev and sum(a * b for a, b in zip(prev, q)) < 0:
            q = [-c for c in q]   # keep the sign continuous, for interpolation
        prev = q
        qs.extend(round(c * 1e4) for c in q)
    flat = [qs[i] - (qs[i - 4] if i >= 4 else 0) for i in range(len(qs))]
    key = tuple(flat)
    if key not in index:
        index[key] = len(seqs)
        seqs.append(flat)
    plate[str(pid)] = index[key]

data = {
    'source': 'PALEOMAP PlateModel (C. R. Scotese, 2016), via the GPlates pygplates tutorials data, CC BY 3.0. Simplified by tools/geo/paleomap.py.',
    'note': 'ages[i] is millions of years ago (negative: ahead, today\'s motions held). seq[plate[p]] holds, for every age in turn, a unit quaternion [w,x,y,z] times 10000 taking a present-day point to its place then, each value stored as the difference from the same component one age earlier in the list. land and shelf rings are present-day [lon,lat], each carried by plate p and shown only at ages up to `from`.',
    'ages': AGES,
    'plate': plate,
    'seq': seqs,
    'land': land,
    'shelf': shelf,
    'anchors': anchors,
}
with open(out, 'w') as fh:
    json.dump(data, fh, separators=(',', ':'))
print('plates', len(used), 'sequences', len(seqs), 'land', len(land), sum(len(r['ring']) for r in land), 'shelf', len(shelf), sum(len(r['ring']) for r in shelf))
