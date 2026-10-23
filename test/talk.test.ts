import { describe, expect, it } from 'vitest';
import { JOURNAL, SHIFTS, type Block, type Forecast } from '../src/core/shifts';
import { allTalks, cueKey, INTRO, radioFor, transcript, ACK } from '../src/core/talk';

const blocks = (id: string): Block[] => SHIFTS.find((s) => s.id === id)!.parts.flatMap((p) => p.blocks);

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

  it('give every lesson an opening, one or two talks along the way, and a check', () => {
    for (const s of SHIFTS) {
      const keys = radioFor(s.id).talks.map((t) => cueKey(t.cue));
      expect(keys.filter((k) => k === 'start').length, s.id).toBe(1);
      expect(keys.filter((k) => k === 'check').length, s.id).toBe(1);
      const along = keys.filter((k) => k.startsWith('after:'));
      expect(along.length, s.id).toBeGreaterThanOrEqual(1);
      expect(along.length, s.id).toBeLessThanOrEqual(2);
    }
  });

  it('only wait on figures in their lesson', () => {
    for (const s of SHIFTS) {
      const shown = blocks(s.id).filter((b) => b.kind === 'figure').map((b) => (b as { figure: string }).figure);
      for (const t of radioFor(s.id).talks) {
        if (typeof t.cue === 'object') expect(shown, `${s.id} ${t.id}`).toContain(t.cue.after);
      }
    }
  });

  it('name an asker for every forecast question from town, and only those', () => {
    for (const s of SHIFTS) {
      const ids = blocks(s.id)
        .filter((b) => b.kind === 'figure' && b.figure === 'forecast')
        .flatMap((b) => (b as { options?: Record<string, unknown> }).options!.items as Forecast[])
        .map((q) => q.id)
        .filter(Boolean);
      expect(ids.length, s.id).toBeGreaterThan(0);
      expect(Object.keys(radioFor(s.id).locals).sort(), s.id).toEqual([...ids].sort());
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
    const words = /Anvil Peak|lookout|Juniper|Thunderhead|Walla Walla|Harrow|radio check|\bcrews?\b|trailhead/i;
    for (const s of SHIFTS) {
      const text = JSON.stringify(s);
      expect(text.match(words)?.[0], s.id).toBeUndefined();
    }
    expect(JSON.stringify(JOURNAL).match(words)?.[0]).toBeUndefined();
  });
});
