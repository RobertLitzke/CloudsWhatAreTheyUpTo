// The quiz: flash cards outside the lessons, on real photos and on what makes
// each cloud (core/quiz.ts), shown by lesson-kit's quiz page.

import { quizView as kitQuizView } from 'lesson-kit/quiz-view';
import { mirrorFor } from '../../core/photos';
import { buildDeck } from '../../core/quiz';
import { makeRng } from 'lesson-kit/rng';
import { photoFigure, PHOTOS } from '../photos';
import { store } from '../store';

export const quizView = kitQuizView({
  // The same wrong answers every time a card comes up, so a card is a card.
  deck: buildDeck(PHOTOS, makeRng(1931)),
  store,
  blurb: 'Flash cards on real photos, on what makes each cloud and what it means, and on the ideas behind the lessons. Cards you get right come back after longer and longer gaps; cards you miss come back soon.',
  media: (card) => (card.photo ? photoFigure(card.photo, 'A cloud to name', mirrorFor(card.photo, Math.random)) : null),
});
