# PatchMatch — game design and implementation plan

A synth ear-training puzzle. A target patch loops a short riff; your own patch starts a few
knob settings away; you turn knobs until they match, in as few moves as you can, then commit
and see the puzzle's goal and exactly what was off. Drafted 2026-10-09, revised the same day
(scoring against a hidden goal, repeatable keyed rounds, biased targets, more riffs).

**Status (2026-10-10):** every phase is built except the last two steps of phase 7, which need
Rob: tuning by ear and the deploy. Section 8 says what that covers and where the build departs
from this plan. Added the same day, after the plan: three pedal stages (drive, echo, signal
chain), an arcade mode, and a layout for a phone held sideways. Each is described where it
belongs below and listed at the end of section 8.

**Words.** This plan was first written in golf terms. Rob asked for those to go, so the game
and this document now say *puzzle* (was hole), *move* (was stroke) and *goal* (was par), and
a result is simply so many moves under or over the goal. The code uses the same words.

Sections marked **Decision** were
calls for Rob to overturn; both were built as recommended (one envelope, no backend).

---

## 1. The puzzle

### The loop

1. A riff loops continuously. Two complete synth voices play it in lockstep: **TARGET** and
   **MINE**. Only one is audible.
2. Flip between them at any time (big A/B switch, or Space). The flip is a 15 ms crossfade at
   the same point in the riff, so the comparison is note-for-note. Listening is always free.
3. Decide what kind of difference you hear, then turn the knobs you think are wrong. Every
   click is a move.
4. Commit when you think it matches.
5. The puzzle's goal is revealed, with every parameter that was off, by how much and in which
   direction.

### The four diagnoses

Every parameter belongs to one perceptual category. The categories are how the results are
grouped and how the player's long-term stats are kept ("your ear is weakest on onset").

| Category | Module | Parameters |
|---|---|---|
| Tone colour | Oscillator | wave, pulse width (later: osc 2, FM) |
| Brightness | Filter | cutoff, resonance, envelope amount |
| Onset / shape | Envelope | attack, decay, sustain, release |
| Movement | LFO | rate, depth, destination |
| Thickness | Oscillator 2 | level, detune, interval |
| Metallic edge | FM | amount, ratio |
| Grit | Drive pedal | drive, tone |
| Echo | Echo pedal | time, repeats, mix |
| Signal order | Chain | where the drive sits |

### Moves

One move = one detent of one knob. Knobs are coarse (5–8 positions) and each click is heard
immediately. Turning back is a move too, so a wrong diagnosis costs two (there and back) or
leaves damage behind. A selector (wave, LFO destination) costs one move per change whichever
position you pick.

Because clicks count, puzzle-mode knobs are never dragged. Tapping a dot (or the wedge of space
around it) goes there, and each detent crossed is a move, so a jump of three costs three. Tapping
the knob's face, or below it where the −/+ are, steps one detent left or right. Arrow keys on the
focused knob and the scroll wheel step too. Dragging is free-play only.

### Goal

Each puzzle has a goal, fixed when the puzzle is generated and **hidden until you commit**.

`goal = turns + allowance`, rounded up, where:

- **Turns** is the fewest moves that reach the target: the sum of step differences on
  ordered knobs, plus one per mismatched selector.
- **Allowance** is the moves a competent ear is expected to waste. It is the sum of a
  difficulty weight for each knob that differs, plus extras for how the differences interact.

Draft weights, in moves:

| Knob | Weight | Knob | Weight |
|---|---|---|---|
| Wave | 0.1 | Attack | 0.3 |
| Cutoff | 0.2 | LFO rate, LFO depth | 0.3 |
| Pulse width | 0.4 | Decay, sustain | 0.6 |
| Resonance | 0.4 | Env → filter | 0.7 |
| LFO destination | 0.4 | Release | 0.7 |

| Extra | Moves |
|---|---|
| A difference of only one step (subtle) | +0.3 |
| A confusable pair both differ (cutoff and env amount, decay and sustain) | +0.75 |
| A gated difference (cannot be heard until another knob is fixed) | +1 |

Rounding up means every puzzle has at least one move of grace: flawless play on the simplest
puzzle is one under, and on a tangled five-knob puzzle it can be three or four under.

These weights are my assessment, not measurements. The app keeps wasted moves per knob
locally, so they can be re-fitted from real play later. A re-fit is a new generator version
(see Keys), so no existing puzzle's goal ever changes.

### Hiding the goal has two consequences

- **No visible move budget, and no limit.** A budget of "distance plus slack" would give the
  goal away, so the counter counts moves up. There is no cap either: going over the goal is
  allowed and is simply a worse score. (An earlier draft locked the knobs at 8, 12 or 16
  moves; Rob had it removed.)
- **The number of knobs that differ is not shown either.** The tier tells you the range.

### Scoring

Committing with knobs still wrong adds **two penalty moves per remaining step**, so fixing a
knob (one move) always beats leaving it.

A puzzle is scored against its goal in plain words: "2 under", "on goal", "3 over". A round
is twelve puzzles and its score is the total against the total goal, shown as a results
table: puzzle, riff, goal, moves, ±.

### The dead-knob problem

Several parameters are silent in some patches: pulse width when the wave is not a pulse, LFO
rate and destination when depth is zero, the filter on a bare sine, decay at full sustain.
Rob's rule (2026-10-10): **there are no dead knobs.** A knob that does nothing is locked, not
dimmed, and **a knob that is silent in the target is not scored.** Five rules follow:

1. **Locked on the panel.** `isLive(patch)` says whether any position of a knob would change
   what is heard in your own patch. If not, the knob is locked: unlit, untappable, `aria-disabled`,
   its value still shown. It opens again when the knob that silenced it is turned back, so a
   puzzle can ask you to fix pulse width only after you have put the wave on a pulse. Every lock
   opens through a knob that is never locked (wave, attack, sustain, release, FM amount,
   oscillator 2 level), so none can trap the player. For that reason oscillator 2's level stays
   live even in tune, where it only changes loudness, and the LFO destination stays live while
   the depth is up, so a destination that does nothing can still be chosen away.
2. **Scored by the target.** **Only parameters active in the target are scored** (`isActive`
   on the target's sound, so pulse width counts only when the target is a pulse); the rest
   count as matched whatever the player did, so trying the pulse wave on a triangle target costs
   nothing. It is the *target* that decides, never the player's own patch. Were a knob ignored
   because the player's wave left it locked, then on a puzzle that starts on a saw with a wrong
   pulse width, leaving the wave alone would silence the width and be cheaper than solving
   (the width is locked on a saw, so it cannot be fixed until the wave is).
3. The generator only creates differences on parameters that are *active* in the target (a
   stricter rule, `isActive`, kept apart from `isLive` because it is part of what a key means)
   and audible on the chosen riff (each riff carries computed features: has rests, longest
   note, pitch range). A parameter silent in the target keeps the start's value, which is the
   target's.
4. **Two settings that sound the same both match.** With the echo off, a drive just behind
   the filter and a drive at the end of the chain are the same place, so a puzzle whose target
   has one accepts the other (`soundsAlike` in `active.ts`, `alike` in a generator's rules).
   The generator never asks for a difference between two such settings.
5. A dev-only audit page (`/audit.html` on the dev server) renders every knob at each pair of
   neighbouring positions through an `OfflineAudioContext`, on three riffs, and measures how
   far apart the two renders are: the average difference in third-octave band level, the
   difference in the one band that moves most (for a narrow change such as resonance), and
   the difference over the tenth of the loop that moves most (for a brief one such as a
   release tail). A step that reads under 1 dB with no band and no moment moving 3 dB is
   suspect. Section 8 lists what the first run changed.

### Difficulty tiers

| Lever | Easy | Hard |
|---|---|---|
| Knobs different | 1 → 2–3 over the round | 2–3 → 5 |
| Size of each difference | 2–3 steps (obvious) | 1 step (subtle) |
| Which knobs | spread across modules | confusable pairs and gated knobs |

Knobs different, by puzzle:

- Easy `1 1 1 2 2 2 2 3 3 3 3 3`
- Normal `1 2 2 2 3 3 3 3 4 4 4 4`
- Hard `2 2 3 3 3 4 4 4 5 5 5 5`

### After commit

- The goal, your moves, and the result in words.
- Each knob shows a ghost tick at the target position and a signed error ("cutoff: 2 steps
  too dark").
- A one-line diagnosis: "The differences were brightness ×2 and movement ×1. You also spent
  2 moves on tone colour."
- Three-way listening: target, your final patch, your starting patch.
- The scope and spectrum display turn on. During the puzzle they are off, otherwise the game
  becomes matching two pictures.

---

## 2. Rounds and keys

A round is twelve puzzles at one stage and one tier, with a random riff and patch on each
puzzle. It is the only game unit: there is no separate exam. Play as many rounds at a stage as
you like; every one is different.

### The key

Every round has a key that fully determines it. Save it to replay the round, or share it so
someone else plays the same twelve puzzles.

```
14N-K7QX2M        version 1 · stage 4 · normal · seed K7QX2M
14N-K7QX2M/07     the same round, puzzle 7 on its own
```

- **Version** names a frozen generator: step tables, target bias, goal weights, random-number
  routine, and the riff pool as it stood. As built there are two: `1` is generator v1 over
  every pooled riff, and `A` is the same generator over the public-domain riffs only, which
  is what a public-domain build mints. A full copy plays both.
- **Stage** says which modules are in play. Everything else sits at its default.
- **Tier** is E, N or H.
- **Seed** is 30 bits in Crockford base-32 (no I, L, O or U, so it survives being read aloud).
  Each puzzle's riff and patch come from a hash of the seed and the puzzle number.

A key is also a link (`#/round/14N-K7QX2M`), and the result shares as a line of text:
`14N-K7QX2M · −3`. Saved keys are listed with your best score on each. A daily round is just
the key whose seed is derived from the date.

### Keeping old keys working

This is the part that needs discipline, so it is written down as rules:

1. **Riffs have permanent ids and a "since" version.** The list only grows. A version-1 key
   picks from the riffs that existed at version 1, in id order, whatever has been added since.
   Fixing a wrong note in a riff is allowed; removing or re-ordering riffs is not.
2. **New modules default to "off".** Second-oscillator level, FM amount and any future effect
   start at a value that makes no sound, so an old key's patches are unchanged by their
   arrival. The stage in the key says they stay off.
3. **Any change to what a key produces is a new version.** Re-tuned steps, new bias weights,
   new goal weights, a new riff: bump the version for new rounds and leave the old generator in
   the bundle. Each one is a few hundred bytes of tables.
4. **Golden-key tests enforce it.** A fixture file maps a few dozen keys to the exact puzzles
   they must produce (riff id, target, start, goal). The build fails if any existing key drifts.

One wrinkle: riffs are tagged public-domain or not, and a deployment may ship the
public-domain set only (see Riffs). A key from a full copy opened in such a copy reports which
riffs are missing rather than silently substituting. For that to work the pool is written out
by id in `gen/v1.ts`, not derived from whichever riffs happen to be in the bundle.

One more thing to do at the freeze: the generator's audibility rules read each riff's longest
note and longest silence, so correcting a riff's notes could shift an old key's patch.
Snapshot those two numbers per pooled riff into `gen/v1.ts` when version 1 is frozen.

### Targets lean towards normal settings

Target patches are not uniformly random. Each knob has a weight per position that favours its
ordinary range, mixed with a flat distribution so the extremes still turn up:

| Knob | Favours |
|---|---|
| Cutoff | the middle four of eight positions |
| Resonance | the lower three |
| Attack, release | the shorter three |
| Sustain | 25–75 % |
| Pulse width | 50–30 % |
| LFO depth | off to moderate |
| Env → filter | 0–2 octaves |

Roughly two draws in three come from the favoured range. A short veto list then rejects the
few combinations that are unusable rather than merely odd: lowest cutoff with no envelope
amount, zero sustain with the shortest decay, the longest attack on a riff of short notes.
The starting patch is the target with differences applied, so it inherits the same sanity.

---

## 3. The synth

### Base parameters and draft step tables

| Knob | Positions | Values |
|---|---|---|
| Wave | 4, selector | saw · pulse · triangle · sine |
| Pulse width | 5 | 50 · 40 · 30 · 20 · 10 % |
| Cutoff | 8 | 160 Hz → 9 kHz, about ⅚ octave per step |
| Resonance | 5 | Q 0.7 · 2 · 4 · 8 · 14 |
| Env → filter | 5 | 0 · 1 · 2 · 3 · 4 octaves |
| Attack | 5 | 2 · 20 · 80 · 250 · 700 ms |
| Decay | 5 | 40 · 120 · 300 · 700 · 1500 ms |
| Sustain | 5 | 0 · 25 · 50 · 75 · 100 % |
| Release | 5 | 20 · 80 · 250 · 600 · 1500 ms |
| LFO rate | 5 | 1 bar · ½ · ¼ · ⅛ · 1⁄16 (tempo-synced) |
| LFO depth | 5 | off → full, scaled per destination |
| LFO destination | 4, selector | pitch · cutoff · pulse width · level |

**One envelope — Decision.** I read "an amp envelope, a filter envelope amount" as a single
ADSR that drives the amp and, through the amount knob, the filter (the MicroFreak layout).
Twelve knobs is already a lot to diagnose. A separate filter envelope could be a later stage.

**The LFO is tempo-synced and restarts with the loop.** A free-running LFO lands at a different
phase on every pass, so target and yours would never line up for comparison.

### Later modules

| Knob | Positions | Values |
|---|---|---|
| Osc 2 level | 5 | off · 15 · 30 · 55 · 100 %, about 5 dB a step |
| Osc 2 detune | 5 | 0 · 5 · 10 · 20 · 40 cents |
| Osc 2 interval | 4, selector | unison · octave down · fifth up · octave up |
| FM amount | 5 | modulation index 0 · 0.5 · 1 · 2 · 4 |
| FM ratio | 5, selector | ×½ · ×1 · ×2 · ×3 · ×4 |

Oscillator 2 plays the same wave as oscillator 1.

### Pedals and the chain

| Knob | Positions | Values |
|---|---|---|
| Drive | 5 | off · 8 · 16 · 24 · 32 dB of gain into a soft clipper |
| Drive tone | 5 | 700 Hz · 1.4 · 2.8 · 5.6 · 11 kHz, a low-pass after the clipper |
| Echo time | 4, selector | 1/16 · 1/8 · dotted 1/8 · 1/4, counted in the riff's sixteenths |
| Echo repeats | 4 | one · 35 · 60 · 80 % fed back round |
| Echo mix | 4 | off · 15 · 35 · 80 %, about 7 dB a step |
| Chain | 3, selector | drive first · middle · last |

The chain is the order of three things a note passes through after the oscillators: the filter
(with the envelope's level), the drive and the echo. The filter always comes before the echo,
so the one setting is where the drive sits. **Middle** (filter, drive, echo) is the default and
is where a pedal usually goes. **First** (drive, filter, echo) clips the raw oscillator, so the
filter tidies the fizz and the drive stops following the envelope. **Last** (filter, echo,
drive) clips the echoes along with the note, and they smear into it. The panel's chain module
draws the order as a row of boxes. This is what the plan called the effect-chain order mode; it
became an ordinary knob rather than a separate puzzle type.

### Engine (Web Audio, native nodes only)

- **Oscillator.** All wave sources run all the time and the selector switches gains, so a wave
  change is click-free and needs no graph rebuild. Native oscillators are already band-limited.
- **Pulse width.** `OscillatorNode` has no pulse width. A pulse is a saw minus a delayed copy
  of itself, with the delay set to `width / frequency`. The delay time is an `AudioParam`, so
  the LFO can modulate it. Delay and LFO depth are rescheduled per note because both depend on
  pitch. If this sounds poor in practice, the fallback is a small `AudioWorklet` oscillator
  loaded from a Blob URL, which still fits in one HTML file.
- **Filter.** Two `BiquadFilterNode` low-passes in series (24 dB/oct), resonance on the second.
  Envelope and LFO modulation go into `detune` (cents), not `frequency`, so modulation depth
  is in octaves at any cutoff.
- **Envelope.** The riff is known in advance, so the whole envelope curve is computed as
  breakpoints by a pure function and scheduled onto the amp gain and a `ConstantSourceNode`
  for the filter. That avoids `cancelAndHoldAtTime`, which is not dependable across browsers,
  and makes the envelope maths testable without a browser. Live notes in free-play use
  `setTargetAtTime`, which always continues from the current value.
- **FM.** A dedicated sine at a ratio of the note, through a gain, into oscillator 1's
  `frequency` input; native audio-rate modulation. It is not oscillator 2, so the two
  modules can be diagnosed separately.
- **Oscillator phase.** With one oscillator its phase cannot be heard. With two, or with FM,
  the phase between them is the sound: a detuned pair beats, and a voice whose knob was
  turned at a different moment beats out of step with one that was not, even at identical
  settings. So a voice using either extension swaps in a fresh set of oscillators at every
  loop start, all phases at zero, over a 4 ms hand-over. Two voices with the same settings
  are then the same signal from the next loop start on. This is the oscillators' version of
  restarting the LFO with the loop.
- **Drive.** Gain, a `WaveShaperNode` holding a tanh curve, a low-pass for the tone, and a
  make-up gain worked out from the drive so that more drive is squarer rather than louder.
  There are three of them in each voice, one at each place the pedal can sit, and the chain
  setting says which is switched on; moving the pedal is a crossfade, not a rewiring. No
  oversampling, so the dry path and the clipped path stay in step while they cross.
- **Echo.** A `DelayNode` with a feedback gain and a 4.5 kHz low-pass in the loop, so each
  repeat is a little duller. The note goes straight through at full level; the mix is how much
  is sent to the delay. The gap is a count of sixteenths, so a loop now carries the length of
  a sixteenth as well as of a bar.
- **Sequencer.** The standard look-ahead scheduler (25 ms timer, 100 ms horizon) drives both
  voices from one clock.
- **Safety.** A limiter on the master bus and a capped Q; high resonance on an open filter is
  loud. The `AudioContext` is created on the first tap, never at render (a Syrinx lesson).

One `ParamSpec` table drives everything: id, module, category, puzzle steps, target bias, goal
weight, free-play range and curve, unlock stage, `active()` rule, value formatter. The knob
component, generator, scorer, results screen and engine all read it, so the second oscillator
and FM are new rows plus their wiring.

---

## 4. Modes

### Stages ("Learn" in the app)

Locked modules are visible on the panel but unlit, and held at defaults in every patch.

| Stage | Unlocks | Teaches |
|---|---|---|
| 1 Waveforms | wave, pulse width | harmonics; hollow vs buzzy vs pure |
| 2 Filter | cutoff, resonance | brightness; the resonant peak |
| 3 Envelopes | ADSR, then env → filter | pluck vs swell; a filter that moves per note |
| 4 Modulation | LFO | vibrato, wah, PWM, tremolo |
| 5 Second oscillator | osc 2 | beating, thickness, intervals |
| 6 FM | FM amount and ratio | metallic and bell tones |
| 7 Drive | drive pedal: drive, tone | clipping, grit, the sustain it adds; tone against cutoff |
| 8 Echo | echo pedal: time, repeats, mix | repeats in time with the riff; louder against longer |
| 9 Signal chain | where the drive sits | why filter, drive and echo sound different in another order |

Each stage opens with a lesson and four practice puzzles whose differences are all on the new
module. A lesson is a walk through the module in four short parts, after the pattern of
Ableton's Learning Synths: each part is one idea in a sentence or two, one control to try it
on (a knob drawn large, or two knobs as a square to drag a finger around), and one small
thing to do, which ticks itself off when done and offers the next part. Each part sets the
other knobs where it needs them as it opens. The loop plays as soon as something is turned,
the scope stays pinned to the top of the screen, and a last section puts all the stage's
knobs out together on the panel with a few ready-made examples. After that the stage is simply a place to play rounds: new riffs and patches
every time, with the best round at each difficulty kept.

The next stage opens once any normal-tier round at the current stage finishes at +6 or better
(the threshold is a guess to tune). A setting unlocks everything for people who already know
synths.

### Round

Pick any unlocked stage and a tier, or paste a key. This replaces the separate quick session;
it is the same thing the stages run.

### Arcade

The fun mode: the same puzzles, played as a run instead of scored against a goal.

- **No commit.** A level ends itself the moment the patch matches the target (or sits somewhere
  that sounds the same), flashes "Locked", and the next level starts on a new riff.
- **The signal meter** is the one thing at stake. It drains while a level plays (1 a second at
  level 1, rising to 2.5), a click that leaves the patch no closer costs 6 more, and a match
  puts back 22 plus 2 for each move the puzzle needed, plus 8 if no click was wasted. Empty,
  and the run is over. Pausing stops the sound, the drain and the knobs together.
- **The ramp.** A new module every two levels, as far as the last stage the player has opened.
  Knobs different go 1 1 1 2 2 2 2 3 on the easy tier's obvious differences, then 3 3 3 3 4 4
  4 4 on normal, then 4 4 4 and 5 from there on with the hard tier's subtle ones.
- **Points** are 100 plus 40 for each move the puzzle needed, plus 5 for each second inside the
  level's expected time, all multiplied by the streak: half as much again for each level in a
  row cleared without a wasted click, up to four times.
- The best run is kept in the save. When a run ends the panel shows the last target's rings.

It tells you at once whether a click was right, which a round never does, so it is practice
and play rather than a measure of anything: arcade levels are not added to the Your ear table.
The rules are in `core/arcade.ts` and every number in them is a guess to tune by playing.

### Free play

Everything unlocked, knobs continuous and draggable, scope and spectrum on.

- One selector says what loops: any riff, a loop of your own, or **Keyboard**, which is where
  you play by hand and record. The keyboard and its recorder are on the page only when the
  loop is your own.
- The keyboard is a strip (two octaves, a little over one on a narrow screen, with an octave
  button at each end) and the computer keyboard (the `A W S E D F…` row, `Z` and `X` for
  octave). It stays at the foot of the screen while the knobs scroll above it, and on a phone
  held sideways it takes a third of the height. One voice, last key wins, and lifting it
  hands back to a key still held. A key stops the loop: the two take turns.
- Tempo is set in the display strip, 40 to 240 bpm. A riff or a saved loop brings its own and
  can then be sped up or slowed; a recording is made at whatever it is set to.
- Record: one-bar count-in, 1, 2 or 4 bars, snapped to sixteenths or not. The take loops as
  soon as it ends; recording again replaces it.
- Name and keep sounds and loops (forty of each). They live in the same save as progress, so
  the export and import in Settings carry them.

Free play gets built first, because it is the test bench for the engine and the knob ranges.

---

## 5. Riffs

Seventy-two lines of one to four bars, all playable as a single monophonic voice. Stored as
compact text on a sixteenth grid (`E2:2 -:2 G2:1 …`) with a permanent id, tempo, bar count and
a public-domain flag, transposed into one register so the cutoff steps mean the same thing on
every riff.

**Electronic (18):** Kraftwerk, The Model · Donna Summer, I Feel Love · Gary Numan, Cars ·
Depeche Mode, Just Can't Get Enough · Depeche Mode, Enjoy the Silence · New Order, Blue Monday ·
Eurythmics, Sweet Dreams · Yazoo, Don't Go · Harold Faltermeyer, Axel F · Jean-Michel Jarre,
Oxygène IV · Daft Punk, Da Funk · Daft Punk, Around the World · Darude, Sandstorm · Zombie
Nation, Kernkraft 400 · Faithless, Insomnia · Benny Benassi, Satisfaction · Avicii, Levels ·
Stranger Things theme

**Pop (16):** a-ha, Take On Me · Europe, The Final Countdown · Van Halen, Jump · The Human
League, Don't You Want Me · Michael Jackson, Billie Jean · Michael Jackson, Thriller · Queen,
Another One Bites the Dust · Queen and David Bowie, Under Pressure · Stevie Wonder,
Superstition · Ray Parker Jr., Ghostbusters · Britney Spears, Toxic · Gorillaz, Feel Good Inc. ·
MGMT, Kids · The White Stripes, Seven Nation Army · The Weeknd, Blinding Lights · M83,
Midnight City

**Metal and rock (16):** Deep Purple, Smoke on the Water · Black Sabbath, Iron Man · Black
Sabbath, Paranoid · Led Zeppelin, Immigrant Song · Cream, Sunshine of Your Love · AC/DC,
Thunderstruck · Judas Priest, Breaking the Law · Iron Maiden, The Trooper · Ozzy Osbourne,
Crazy Train · Metallica, Enter Sandman · Metallica, Master of Puppets · Megadeth, Symphony of
Destruction · Slayer, Raining Blood · Pantera, Walk · Rage Against the Machine, Killing in the
Name · Rammstein, Du Hast

**Pearl Jam (3):** Alive (intro riff) · Even Flow (main riff) · Jeremy (bass intro)

**Iron & Wine (3):** Boy with a Coin (guitar riff) · Naked as We Come · Flightless Bird,
American Mouth (vocal melody). These are fingerpicked or sung, so each is reduced to a single
line, and they are the ones I am least sure of from memory.

**Public-domain folk (16):** Greensleeves · Scarborough Fair · The House of the Rising Sun ·
Shady Grove · Drunken Sailor · Wellerman · Star of the County Down · Swallowtail Jig · The
Irish Washerwoman · Drowsy Maggie · Sailor's Hornpipe · Old Joe Clark · Korobeiniki (the
Tetris tune) · Kalinka · Hava Nagila · Sakura Sakura. Each is the traditional melody's opening
phrase, not a later recording's arrangement: the tune of Scarborough Fair is free to use, the
Simon & Garfunkel countermelody is not, and the same goes for the Animals' arpeggio on Rising
Sun.

Two cautions:

- **These were transcribed from memory and many are wrong.** Each riff carries a grade:
  3 confident (20), 2 roughly right (16), 1 a guess (36). Only grades 2 and 3 are drawn for
  rounds, so the round pool is 36 riffs (13 of them public domain) until the rest are checked.
  The dev-only audition page (`/audition.html` on the dev server) plays all 72, least certain
  first, and records which are wrong.
- **Fifty-six of these are copyrighted melodies.** As a personal offline app that is a small
  matter. If the deployed copy is public it is worth a thought; I am not a lawyer. The folk
  set exists partly for this: a build flag ships the sixteen public-domain riffs alone, which
  is enough for the game to work.

---

## 6. Look and feel

A flat MicroFreak-style panel: a thin "OLED" strip across the top (riff title, puzzle 4/12,
moves so far), module blocks in a row with hairline silver dividers and small tracked
uppercase labels, and, in free play, a flat capacitive-keyboard strip along the bottom. A
puzzle has no keyboard strip: an earlier build drew an inert one under the panel and it read
as a progress bar. The round summary is a results table in the same style.

| Role | Colour |
|---|---|
| Background | very dark blue, about `#070B1A` |
| Panel | `#0C1226`, hairlines in silver `#B8C4D6` |
| Yours, values | pale cyan `#9FE8F5` |
| Target, commit, warnings | orange `#FF7A1A` |
| Where a dial is set: its lit dot, its filled arc | pale orange `#FFC999`, and `#6B5A4C` on a dark knob |

Wherever two patches are compared, cyan is yours and orange is the target, including the
ghost rings on the results screen. The pale orange of a dial's own setting was Rob's choice
(2026-10-10); it is a filled dot or arc, so it does not read as the target's ring. Knobs are SVG with a ring of LED dots, one per detent; free-play knobs show a
continuous arc instead. Each knob is a `role="slider"` with a spoken value. On a phone the
modules stack two by two, portrait, and the knob is sized from the panel's width so two fill a
module's row: about 76 px on a 375 px screen, 62 px on a 320 px one, never under 56 or over
80. Padding and gaps are tight to pay for it; the page scrolls a little at that size.

**A phone held sideways** (landscape, under 520 px tall) gets its own layout, because there the
panel used to start half-way down the screen and run off the bottom. The strip, the A/B switch,
play and commit become a rail down the left; the top bar steps aside (the rail carries a link
home); and the panel takes the rest, in rows that share the screen's height: two rows up to
stage 5, three from stage 6. A knob is as big as the row's height and width both allow, a
selector's options shrink with the row, and FM's five ratios fold into two columns. The whole
of a stage 9 puzzle, 23 controls, fits a 640 × 330 screen without scrolling. After a commit
the same button becomes "Next puzzle" and the result is shown in the strip, so the reveal needs
no scrolling either (this part applies upright too). Free play and the arcade use the same
rail, and a lesson's parts put the words beside the control instead of above it.

Free play has no display strip. Its one control row is play, the what-loops selector (each
riff listed as title and artist) and tempo with a button either side, so the knobs start
higher. Deleting a saved loop moved into the recorder card.

---

## 7. Build and deployment

### What "like Syrinx" carries over

Vite 6, strict TypeScript, vitest, no UI framework (the `el()` helper and hash router),
component CSS with a tokens file, `vite-plugin-pwa` with the service worker registered by hand
and an update prompt, a two-stage Dockerfile built by Coolify, its own private GitHub repo,
`.claude/launch.json`, and a port from the `PROJECTS.md` scheme (next free slot is 5400 today).

### What differs

- **Single HTML file.** `vite-plugin-singlefile` inlines all JS, CSS and the font into
  `index.html`. A service worker cannot be inlined, and an installable PWA needs a manifest and
  icons as real files. So the output is `index.html` (the entire app, also runnable straight
  from disk) plus `sw.js`, `manifest.webmanifest` and three icons. The service worker precaches
  exactly one page.
- **No backend — Decision.** Syrinx's container is PocketBase because it has accounts. PatchMatch
  has nothing that needs a server: progress and saved keys are a few kilobytes in
  `localStorage`, versioned, with JSON export, and sharing a round is a key in a link.
  Recommended runtime stage is plain nginx serving `dist/`. Storage sits behind a small
  interface so Syrinx's PocketBase pattern can be lifted in later if you want progress to
  follow you across devices.
- **Own repo.** The folder is currently an empty directory inside the outer `F:\Programming`
  repo. It should get `git init` and a line in the outer `.gitignore`, as Syrinx did.

### Layout

```
src/
  core/      pure TypeScript, no DOM or Web Audio; everything here runs under vitest
    params.ts  patch.ts  rng.ts  key.ts  score.ts  round.ts
    campaign.ts  envelope.ts  storage.ts  active.ts  loop.ts (recording)  arcade.ts
    gen/       v1.ts (frozen generator: steps, bias, goal weights), index.ts (dispatch by version)
    riffs/     notation parser, the riff list with ids and "since" versions
  audio/     engine.ts (clock, A/B, live keys, metronome)  voice.ts  offline.ts
  app/       dom.ts  router.ts  components/ (knob, panel, scope, keys, pad, ab, flow)
             views/ (home, learn, lesson, puzzle, round, arcade, freeplay, settings)
             styles/
tools/       icons, the audibility audit page, the riff audition page (dev only)
test/        includes golden-keys.json
```

`voice.ts` builds its graph on any `BaseAudioContext`, which is what lets the audit page render
offline with the same code the game plays through.

### Tests

- **Golden keys:** a fixed set of keys must produce exactly the recorded puzzles. This is the
  test that makes "keys keep working" true rather than hoped for.
- **Generator properties** over ten thousand seeds: turns equal what was asked for, every
  differing parameter is scored, nothing is out of range or vetoed, goal ≥ turns + 1, the same
  key gives the same round.
- Key parsing and formatting, scoring and penalties, envelope breakpoints, the riff parser
  (every riff parses and fills its bars), unlock rules, storage migration.
- Audio is checked by ear and by the audit page.

---

## 8. Phases

| # | Phase | Result | Effort |
|---|---|---|---|
| 0 | Scaffold | Vite, single-file build, PWA shell, tokens, Dockerfile, repo, port; rows in `PROJECTS.md` and Portside | S |
| 1 | Engine and free-play bench | voice, sequencer, continuous knobs, scope, five riffs; the synth sounds right | M |
| 2 | Puzzle core | param table, generator v1 with bias and goal, moves, A/B, commit, results, keyed twelve-puzzle round with results table, golden-key tests | M |
| 3 | Riffs | notation, all seventy-two, audition page, your pass by ear | M |
| 4 | Stages 1–4 | module gating, lesson cards, practice puzzles, stage bests, saved keys, stats by category | M |
| 5 | Free play complete | keyboard input, recorder, saved patches and loops | S–M |
| 6 | Second oscillator and FM | stages 5 and 6 | S–M |
| 7 | Calibrate and ship | audit page, step tables and goal weights tuned (as generator v2 if any key has been shared), offline install checked on a phone, Coolify deploy | M |

**Built so far (2026-10-10): phases 0 to 6, and phase 7 as far as it can go without ears or a
server.** Departures from the plan above:

- Golf terms and the move cap are gone (see Words at the top, and Hiding the goal).
- Phase 4's "saved keys" and "stats by category" are the Your rounds list on the home screen
  and the Your ear table on the Learn page.
- The four base modules are always on the panel, unlit until their stage. The second
  oscillator and FM are left off it until stages 5 and 6, so a phone's screen goes to the
  knobs in play.
- Generator version 1 covers all six stages. It is still unfrozen.
- FM has its own modulator rather than borrowing oscillator 2 (see Engine).
- Half the riffs are held out of rounds until checked by ear (see Riffs).
- Saved sounds and loops share the progress file rather than having an export of their own.

**What the audit changed (2026-10-10).** Numbers, not ears, so each is a first correction:

- *Tremolo* was a straight line from the depth knob and its first two steps measured about
  1 dB. It now follows a curve: about 3, 7 and 13 dB of swing, then full.
- *Oscillator 2 level* was 25 % steps, which are 6, 3.5 and 2.5 dB apart. It is now 15, 30,
  55 and 100 %, about 5 dB a step.
- *Decay* was scored whenever sustain was below 100 %. At 50 % sustain and above its length
  measured under 1 dB, so it now counts only with sustain at 25 % or less, or at 50 % when
  the filter envelope is at 2 octaves or more.
- Steps the generator no longer asks for: the top two cutoff positions against each other on
  a triangle; the first step of FM on a saw or pulse; a single step of oscillator 2 level in
  unison; detune, and unison against octave up, with oscillator 2 at 15 %.
- The existing riff rules for release (nothing longer than three times the gap between notes)
  and long decays matched what was measured, and stay.
- The measure is blind to pitch, so it under-reads vibrato depth and says nothing useful
  about whether 15 cents of vibrato can be heard. That one is for ears.

**Added after the plan (2026-10-10):**

- *Stages 7 to 9*: the drive pedal, the echo pedal and the signal chain, each with a lesson,
  practice and rounds like the six before them (see Pedals and the chain). They are appended
  to generator version 1: every key for stages 1 to 6 still produces the puzzles it did, which
  the golden keys confirm, and ten keys for the new stages joined the fixture.
- *What the audit said about the pedals.* Echo mix in even steps measured under a decibel
  between neighbours, so it has four positions about 7 dB apart. Echo repeats cannot be told
  apart under held notes: a single step is asked for only where a pluck leaves silence long
  enough for two repeats, and otherwise only a jump of two with the mix at 35 % or more. Echo
  time needs that much mix, or a pluck. The drive's tone is asked for only below the top of
  what reaches it: under the cutoff when the drive is first, and a few octaves above the
  cutoff (more with more drive) when it is not. The first step of drive is not asked for on a
  saw or pulse with the drive first, and a target never has the drive first on a bare pulse,
  where clipping a two-level wave changes nothing.
- *Arcade* (see Modes) and the *sideways layout* (see Look and feel).
- Smaller things: the commit button turns into the next button; a short buzz on each knob
  click where a phone can (a setting); a result under the goal glows as it appears.

**Left for Rob:**

- Listen. Loudness between the four waves, the step tables above, and the goal weights are
  all still untested by ear, and the goal weights can only be tuned from real play. The same
  goes for the pedals: whether the drive holds its loudness as it comes up, and whether the
  echo and chain differences the audit passed are as plain to an ear as to its numbers.
- Play the arcade and say what is wrong with its numbers: how fast the meter drains, what a
  wasted click costs, how quickly the levels get hard.
- Check the riffs (`/audition.html`).
- Try the installed copy on a phone. The service worker was broken in every build until
  2026-10-10 (the icons were listed twice and workbox refused them); it now installs, and a
  desktop browser loads the page with the server stopped.
- Deploy: a private GitHub repo and a Coolify app from the `Dockerfile`. Decide first whether
  the public copy carries all the riffs or the public-domain ones only (`--build-arg MODE=pd`).

Phases 0–2 give a playable game. One ordering note: version 1 of the generator is frozen the
moment a key leaves your machine, so the riff list and step tables should be settled (phases 3
and 7) before keys are shared with anyone. Until then, version 1 can change freely.

Later, not planned in detail: a daily round, Web MIDI, a challenge link that turns a free-play
patch into a single puzzle.
