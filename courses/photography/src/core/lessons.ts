// The lessons: a course on photography for someone who owns a long zoom and
// wants to stop leaving it on automatic. Each is paragraphs and live figures,
// in parts; the next part opens once the figures in this one have had their
// small task done. The last part is a check, and the lesson ends with its summary.
//
// The course is written for nature photography with a Nikon Coolpix P950
// (src/core/camera.ts), so every number in a figure is one that camera can
// really reach. What is true of it is mostly true of any camera; where a
// bigger sensor or a faster lens changes the answer, the lesson says so.
//
// A lesson with no parts is planned and not yet written: it shows on the home
// page as coming, and its route goes home. Each written lesson's words are a
// JSON file in data/lessons. The lesson format and the view that reads it are
// Didactics' lesson.ts. Text takes a little markup (see app/figures/kit.ts
// prose): **bold**, *italic*, [[words|colour]] to tie a word to the colour it
// wears in the figures, and [^id] for a note from the lesson's `footnotes`,
// which opens in a popup.

import type { Block as KitBlock, Lesson as KitLesson, Part as KitPart } from 'didactics/lesson';
import tour from '../data/lessons/tour.json';
import light from '../data/lessons/light.json';
import aperture from '../data/lessons/aperture.json';
import shutter from '../data/lessons/shutter.json';
import iso from '../data/lessons/iso.json';
import lens from '../data/lessons/lens.json';

export const FIGURE_IDS = [
  // Focus and the aperture.
  'cone', 'aperture', 'closeUp', 'diffraction', 'hyperfocal',
  // Time and movement.
  'shutter', 'shake', 'silkWater', 'pan',
  // Light and the sensor.
  'stops', 'iso', 'photons', 'meter', 'modes', 'pooling', 'dusk',
  // The lens.
  'zoom', 'angle', 'longEnd', 'compression', 'crop',
  // Colour.
  'kelvin', 'whiteBalance',
  // The pieces every lesson has.
  'photo', 'challenge', 'check',
] as const;
export type FigureId = (typeof FIGURE_IDS)[number];

export type Block = KitBlock<FigureId>;
export type Part = KitPart<FigureId>;
export type Lesson = KitLesson<FigureId>;

/**
 * The outline: what the course covers, in order. Only the lessons with parts
 * are written; the rest are the plan, shown on the home page as coming, and
 * are filled in one at a time (see "Adding a lesson" in the README).
 */
export const LESSONS: readonly Lesson[] = [
  tour as Lesson,
  light as Lesson,
  aperture as Lesson,
  shutter as Lesson,
  iso as Lesson,
  lens as Lesson,
  planned(7, 'focus', 'Focus: telling the camera what you meant', 'Autofocus modes, focus areas, and getting the bird instead of the branch in front of it', [
    'Single and continuous autofocus, and which to use for what',
    'Focus areas: spot, centre, subject tracking, and the P950\'s bird option',
    'Why the camera grabs the branch, and the three ways out',
    'Manual focus, the zoomed view, and when it is the fastest way',
    'Pre-focusing on a perch and waiting',
  ]),
  planned(8, 'colour', 'The colour of light', 'White balance, the hour of the day, and the difference between light you fix and light you go out for', [
    'Colour temperature, and why warm is the low number',
    'What automatic white balance is guessing, and the scenes that fool it',
    'Golden hour, blue hour and overcast, as three different kinds of light to use',
    'Backlight and rim light, and metering for them',
    'What a polariser does to water, leaves and sky',
  ]),
  planned(9, 'seeing', 'Seeing the picture before you take it', 'Backgrounds, light direction, distance and framing: the decisions that are made with your feet', [
    'The background is half the picture, and you move it by moving',
    'Light from behind you, beside you, and in front of you',
    'Portrait of an animal, or an animal in its place: two different pictures',
    'Framing, the horizon, and what to leave out',
    'Getting close without disturbing: fieldcraft as a photographic technique',
  ]),
  planned(10, 'birds', 'Birds, in practice', 'A settings recipe for perched and flying birds, and the way to work when there is no time to think', [
    'A starting point for a perched bird, and why',
    'A starting point for a bird in flight, and what changes',
    'Leaving Bird-watching mode: what it was choosing, and what you now choose instead',
    'Finding the bird at 2000 mm, and the P950\'s framing button',
    'Working a subject: a safe frame first, then better ones',
  ]),
  planned(11, 'after', 'After the shutter', 'The file the camera made, what can still be recovered from it, and a short editing pass that is mostly undoing', [
    'JPEG and RAW on this camera, and what each keeps',
    'White balance, exposure and shadows after the fact',
    'Cropping as the last part of composition, and how far it goes',
    'Sharpening and noise reduction, in that order and in moderation',
    'Keeping the ones worth keeping',
  ]),
  planned(12, 'history', 'How the camera got here', 'The long story behind the dials: the dark room, the silver, the film, the chip', [
    'The camera obscura, and the problem of keeping the picture',
    'Silver halides: the chemistry that made photography possible',
    'Why film speed became ISO, and why f-numbers are such strange numbers',
    'The charge-coupled device, the sensor in your hand, and what is still film-shaped about it',
    'A few photographers worth knowing, and what each one was after',
  ]),
];

/** A lesson that is planned but not written: its title, its promise, and what it will cover. */
function planned(n: number, id: string, title: string, teaches: string, covers: string[]): Lesson {
  return { id, n, title, teaches, parts: [], summary: covers, journal: [] };
}

export const isWritten = (l: Lesson): boolean => l.parts.length > 0;

export function lesson(id: string): Lesson | undefined {
  return LESSONS.find((l) => l.id === id);
}

/** A multiple-choice question in a lesson's check, with a photo of a subject above it. */
export interface Question {
  picture?: string;
  question: string;
  options: string[];
  answer: number;
  why: string;
}
