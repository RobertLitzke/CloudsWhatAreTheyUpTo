import { describe, expect, it } from 'vitest';
import { JOURNAL, SHIFTS } from '../src/core/shifts';
import { allTalks, INTRO, radioFor, transcript, ACK } from '../src/core/talk';

describe('radio talks', () => {
  it('have unique ids and well-formed turns', () => {
    const ids = allTalks().map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const t of allTalks()) {
      expect(t.when.trim(), t.id).not.toBe('');
      expect(t.turns.length, t.id).toBeGreaterThan(0);
      for (const turn of t.turns) {
        expect(turn.them.trim(), t.id).not.toBe('');
        const replies = turn.replies ?? [];
        expect(replies.length, t.id).toBeLessThanOrEqual(3);
        for (const r of replies) expect(r.say.trim(), t.id).not.toBe('');
        // A question has exactly one right answer.
        expect(replies.filter((r) => r.right).length, t.id).toBeLessThanOrEqual(1);
      }
    }
  });

  it('give every lesson an opening, and lines around its check, and nothing in between', () => {
    for (const s of SHIFTS) {
      const talks = radioFor(s.id).talks;
      expect(talks.map((t) => t.cue), s.id).toEqual(['start', 'check']);
      // The check's talk is not played: it opens and closes the check's own
      // questions, so it asks none of its own.
      expect(talks[1].turns.length, s.id).toBe(2);
      expect(talks[1].turns.every((t) => !t.replies), s.id).toBe(true);
    }
  });

  it('let the opening talk switch the radio off', () => {
    expect(INTRO.turns.some((t) => t.replies?.some((r) => r.off))).toBe(true);
  });

  it('write a transcript from the replies picked', () => {
    const lines = transcript(INTRO, [1]);
    expect(lines[0]).toEqual({ who: 'them', text: INTRO.turns[0].them });
    expect(lines[1]).toEqual({ who: 'you', text: INTRO.turns[0].replies![1].say });
    expect(lines[2].who).toBe('them');
    const bare = transcript({ id: 'x', cue: 'start', when: 'now', turns: [{ them: 'Hello' }] }, []);
    expect(bare).toEqual([{ who: 'them', text: 'Hello' }, { who: 'you', text: ACK }]);
  });
});

describe('lessons', () => {
  it('tell no story: that is the radio’s job', () => {
    const words = /Anvil Peak|lookout|Juniper|Thunderhead|Walla Walla|Harrow|radio check|trailhead/i;
    for (const s of SHIFTS) {
      const text = JSON.stringify(s);
      expect(text.match(words)?.[0], s.id).toBeUndefined();
    }
    expect(JSON.stringify(JOURNAL).match(words)?.[0]).toBeUndefined();
  });
});
