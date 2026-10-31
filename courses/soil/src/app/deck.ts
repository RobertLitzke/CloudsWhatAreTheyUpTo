// The quiz deck: flash cards on the ideas in the written lessons (data/quiz.json).

import { conceptCard, type Concept } from 'didactics/quiz';
import ideas from '../data/quiz.json';

export const DECK = (ideas.cards as Concept[]).map((c) => conceptCard(c));
