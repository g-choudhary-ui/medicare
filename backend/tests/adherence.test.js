const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

describe('Adherence Mathematics & Streak Tracking', () => {
  // Pure logic helper for adherence %
  const calculateAdherenceRate = (takenCount, totalScheduled) => {
    if (!totalScheduled || totalScheduled === 0) return 100;
    return Math.round((takenCount / totalScheduled) * 100);
  };

  // Pure logic helper for streak evaluation
  const evaluateStreak = (daysHistory) => {
    let streak = 0;
    for (let i = 0; i < daysHistory.length; i++) {
      const day = daysHistory[i];
      if (day.total === 0) continue; // no meds scheduled
      if (day.taken === day.total) {
        streak++;
      } else {
        break; // broken streak
      }
    }
    return streak;
  };

  test('Calculates 100% adherence when all doses taken', () => {
    const rate = calculateAdherenceRate(28, 28);
    assert.equal(rate, 100);
  });

  test('Calculates correct rounded adherence percentage for partial doses', () => {
    const rate = calculateAdherenceRate(25, 30);
    assert.equal(rate, 83); // 25/30 = 83.33% -> 83%
  });

  test('Calculates consecutive streak correctly', () => {
    const history = [
      { date: '2026-11-15', total: 4, taken: 4 },
      { date: '2026-11-14', total: 4, taken: 4 },
      { date: '2026-11-13', total: 4, taken: 4 },
      { date: '2026-11-12', total: 4, taken: 3 }, // 1 missed
      { date: '2026-11-11', total: 4, taken: 4 },
    ];
    const streak = evaluateStreak(history);
    assert.equal(streak, 3);
  });

  test('Resets streak to 0 if most recent day had missed doses', () => {
    const history = [
      { date: '2026-11-15', total: 3, taken: 2 }, // missed 1 today
      { date: '2026-11-14', total: 3, taken: 3 },
      { date: '2026-11-13', total: 3, taken: 3 },
    ];
    const streak = evaluateStreak(history);
    assert.equal(streak, 0);
  });
});
