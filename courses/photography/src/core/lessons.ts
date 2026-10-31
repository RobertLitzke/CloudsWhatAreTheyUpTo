// The lessons: a course on photography for someone who owns a long zoom and
// wants to stop leaving it on automatic. Each is paragraphs and live figures,
// in parts; the next part opens once the figures in this one have had their
// small task done. The last part is a check, and the lesson ends with a log.
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

export const FIGURE_IDS = [
  // Focus and the aperture.
  'cone', 'aperture', 'closeUp',
  // Time and movement.
  'shutter', 'shake', 'silkWater',
  // Light and the sensor.
  'stops', 'iso', 'photons',
  // The lens.
  'zoom', 'angle', 'longEnd',
  // Colour.
  'kelvin', 'whiteBalance',
  // The pieces every lesson has.
  'photo', 'check',
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
  planned(2, 'light', 'Light, and the three ways to let it in', 'What a stop is, how the camera measures the light, and why the same picture can be had three different ways', [
    'A stop: half the light, or twice it, on any of the three dials',
    'What the meter is doing, and the two or three ways it can be fooled (snow, a bird against the sky)',
    'The histogram, and exposing to the right without clipping the whites',
    'Exposure compensation: the one dial to reach for when the camera is nearly right',
    'The P950\'s modes: P, S, A and M, and what each one hands back to you',
  ]),
  planned(3, 'aperture', 'The aperture and what stays sharp', 'Why the hole in the lens decides how much of the scene is in focus, and why a small sensor makes that band so wide', [
    'Depth of field from first principles: a point, a cone, a disc',
    'The three things that move the band: aperture, how far away you focus, and focal length',
    'Why the P950 holds nearly everything sharp, and what you do when you want a soft background anyway',
    'Diffraction: why f/8 on this camera is softer than f/4 everywhere, not just behind the subject',
    'Hyperfocal focusing for landscapes',
  ]),
  planned(4, 'shutter', 'Shutter speed, and everything that moves', 'Freezing a wingbeat, catching a panning bird, and telling your own shake apart from the subject\'s movement', [
    'What a shutter speed does to a moving thing, in fractions of the frame',
    'Two blurs that look alike and have different cures: subject movement and camera shake',
    'The rule of thumb, the stabiliser, and what each is worth at 2000 mm',
    'Panning, and letting the background blur on purpose',
    'Long exposures on water, and why daylight runs out of room',
  ]),
  planned(5, 'iso', 'ISO, noise, and the light you do not have', 'Why grain is a counting problem, when to raise ISO without hesitating, and where this camera runs out', [
    'Photons as a count, and why the count is rough when it is small',
    'What ISO really changes, and what it does not',
    'Reading noise, shot noise, and why shrinking a picture cleans it up',
    'The small sensor\'s real limit, and planning a dawn outing around it',
    'Noise reduction in the camera and afterwards, and what it costs in feather detail',
  ]),
  planned(6, 'lens', 'The lens: 24 mm to 2000 mm', 'What focal length actually changes, what the long end costs, and how to get the most out of an 83× zoom', [
    'Angle of view, and what "equivalent" means on a small sensor',
    'Reach: how big a bird gets at 2000 mm, and when cropping beats zooming',
    'The widest aperture closing as you zoom, and the shutter you can still afford',
    'Compression: why a far hill looks huge behind a near bird',
    'Heat haze, atmosphere and the real limit on a long lens',
  ]),
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
  return { id, n, title, teaches, parts: [], learned: covers, next: '', journal: [] };
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
