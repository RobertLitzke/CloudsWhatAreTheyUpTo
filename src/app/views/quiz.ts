// The quiz: flash cards on the ideas in the written lessons (data/quiz.json),
// shown by Didactics' quiz page with spaced repetition.

import { conceptCard, type Concept } from 'didactics/quiz';
import { quizView as kitQuizView } from 'didactics/quiz-view';
import ideas from '../../data/quiz.json';
import { store } from '../store';

export const DECK = (ideas.cards as Concept[]).map((c) => conceptCard(c));

export const quizView = kitQuizView({
  deck: DECK,
  store,
  blurb: 'Flash cards on the ideas in the lessons. Cards you get right come back after longer and longer gaps; cards you miss come back soon.',
});
