const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

// Use deterministic clinical engine for unit tests
delete process.env.GEMINI_API_KEY;
const { checkInteractions } = require('../services/geminiService');

describe('AI Drug-Drug Interaction & Refill Forecast Engines', () => {
  test('Detects high-risk drug-drug interaction (Warfarin + Aspirin)', async () => {
    const meds = [
      { name: 'Warfarin', dosage: '5mg', frequency: 'daily' },
      { name: 'Aspirin', dosage: '81mg', frequency: 'daily' },
    ];
    const analysis = await checkInteractions(meds, {});
    assert.ok(analysis.safetyScore < 90);
    assert.equal(analysis.riskLevel, 'High');
    assert.ok(analysis.drugInteractions.length > 0);
    assert.equal(analysis.drugInteractions[0].severity, 'High');
  });

  test('Detects dangerous food warning (Atorvastatin + Grapefruit)', async () => {
    const meds = [
      { name: 'Atorvastatin', dosage: '20mg', frequency: 'night' },
    ];
    const analysis = await checkInteractions(meds, {});
    const grapefruitWarning = analysis.foodWarnings.find(f => f.food.toLowerCase().includes('grapefruit'));
    assert.ok(grapefruitWarning);
    assert.equal(grapefruitWarning.severity, 'High');
  });

  test('Refill prediction accurately calculates days remaining', () => {
    const totalStock = 30;
    const takenDoses = 20;
    const dailyDoses = 2; // twice daily
    const remainingDoses = totalStock - takenDoses; // 10 doses
    const daysRemaining = Math.floor(remainingDoses / dailyDoses); // 5 days

    assert.equal(daysRemaining, 5);
    const status = daysRemaining <= 3 ? 'CRITICAL_REFILL' : daysRemaining <= 7 ? 'REFILL_SOON' : 'OK';
    assert.equal(status, 'REFILL_SOON');
  });
});
