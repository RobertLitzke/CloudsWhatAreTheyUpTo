// One sound at a time on a page. A lesson has several figures that can make a
// sound (the synth itself, and figures with tones of their own); starting one
// stops whichever was sounding, so its button can show it has stopped.

let current: (() => void) | null = null;

/** Start sounding: whatever was sounding is told to stop first. `stop` is how this one is stopped later. */
export function claim(stop: () => void): void {
  if (current && current !== stop) {
    const previous = current;
    current = null;
    previous();
  }
  current = stop;
}

/** This one has stopped on its own. */
export function release(stop: () => void): void {
  if (current === stop) current = null;
}
