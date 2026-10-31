# circuit-kit

A small circuit solver for live lesson figures. Parts go in, each joined
between named nodes (`parts.ts`); `solve(parts)` gives back every node's
voltage from ground, every part's current, and the power each takes
(`solve.ts`); `simulate(parts)` steps the same circuit through time
(`sim.ts`). It is plain TypeScript with no DOM, so it is tested on its own
(`test/`), and the app draws the result.

It handles resistors, lamps (a filament whose resistance rises as it heats),
voltage sources (with an internal resistance and a sine or square wave),
current sources, wires, switches, fuses, constant-power loads, capacitors,
inductors, diodes and LEDs (with temperature), NPN and PNP transistors
(Ebers–Moll), N and P MOSFETs (square law) and op-amps (gain, output
resistance, and rails less a headroom). Curved parts are solved by Newton's
method, op-amps by trying each one following or stuck at a rail until the
answer agrees, and time by backward Euler, with each step halved where the
circuit moves too fast to follow (a two-transistor blinker flipping over,
which the transistors' own junction capacitance sets the pace of). A
circuit that would start perfectly balanced can be nudged with `charged`. A short across an ideal source is
reported as `short` rather than solved.

`e12(lo, hi)` and `nearestE12(x)` give the standard part values.
