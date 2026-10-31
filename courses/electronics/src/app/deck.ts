// The quiz deck: flash cards on the ideas in the written lessons
// (data/quiz.json), shown by Didactics' quiz page with spaced repetition.

import { conceptCard, type Concept } from 'didactics/quiz';
import ideas from '../data/quiz.json';

export const DECK = (ideas.cards as Concept[]).map((c) => conceptCard(c));
