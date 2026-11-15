const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { db } = require('../services/firebaseAdmin');
const { checkInteractions } = require('../services/geminiService');

/**
 * GET /api/ai/drug-check
 * Evaluates all active medications for drug-drug & food interactions
 */
router.get('/drug-check', auth, async (req, res) => {
  try {
    const { profileId, profile } = req;

    // Fetch active medications
    const medsSnap = await db
      .collection('profiles')
      .doc(profileId)
      .collection('medications')
      .where('isActive', '==', true)
      .get();

    const medications = medsSnap.docs.map(doc => ({
      id: doc.id,
      name: doc.data().name,
      dosage: doc.data().dosage,
      frequency: doc.data().frequency,
      times: doc.data().times,
      instructions: doc.data().instructions,
    }));

    const analysis = await checkInteractions(medications, {
      conditions: profile?.medicalConditions || profile?.conditions,
      allergies: profile?.knownAllergies || profile?.allergies,
    });

    res.json({
      success: true,
      data: {
        medicationsCount: medications.length,
        ...analysis,
      },
    });
  } catch (err) {
    console.error('[AI Drug Check]', err);
    res.status(500).json({ success: false, error: 'Failed to analyze drug interactions' });
  }
});

module.exports = router;
