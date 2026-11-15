const express = require('express');
const router = express.Router();
const { db } = require('../services/firebaseAdmin');
const auth = require('../middleware/auth');

// ── Helpers ────────────────────────────────────────────────────────────────────
const datesBetween = (startStr, endStr) => {
  const dates = [];
  const start = new Date(startStr);
  const end = new Date(endStr);
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
};

const getDateRange = (days) => {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - (days - 1));
  return {
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0],
  };
};

// ── GET /api/adherence ─────────────────────────────────────────────────────────
router.get('/', auth, async (req, res) => {
  try {
    const { profileId } = req;
    const today = new Date().toISOString().split('T')[0];

    // Active medications
    const medsSnap = await db
      .collection('profiles')
      .doc(profileId)
      .collection('medications')
      .where('isActive', '==', true)
      .get();

    const medications = medsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    // Build expected doses for today
    const expectedSlots = [];
    medications.forEach(med => {
      if (med.startDate <= today && (!med.endDate || med.endDate >= today)) {
        med.times.forEach(slot => {
          expectedSlots.push({ medicationId: med.id, medicationName: med.name, timeSlot: slot });
        });
      }
    });

    // Fetch today's logs
    const logsSnap = await db
      .collection('profiles')
      .doc(profileId)
      .collection('adherence_logs')
      .where('date', '==', today)
      .get();

    const logs = logsSnap.docs.map(d => d.data());
    const takenSet = new Set(logs.filter(l => l.status === 'taken').map(l => `${l.medicationId}:${l.timeSlot}`));

    const todayStatus = expectedSlots.map(slot => ({
      ...slot,
      taken: takenSet.has(`${slot.medicationId}:${slot.timeSlot}`),
    }));

    const takenCount = todayStatus.filter(s => s.taken).length;
    const totalExpected = todayStatus.length;
    const missedToday = totalExpected - takenCount;
    const todayRate = totalExpected > 0 ? Math.round((takenCount / totalExpected) * 100) : 100;

    // 7-day streak calculation
    let streak = 0;
    const { startDate: streakStart } = getDateRange(30);
    const allLogsSnap = await db
      .collection('profiles')
      .doc(profileId)
      .collection('adherence_logs')
      .where('date', '>=', streakStart)
      .orderBy('date', 'desc')
      .get();

    const logsByDate = {};
    allLogsSnap.docs.forEach(d => {
      const data = d.data();
      if (!logsByDate[data.date]) logsByDate[data.date] = { taken: 0, total: 0 };
      logsByDate[data.date].total++;
      if (data.status === 'taken') logsByDate[data.date].taken++;
    });

    // Count streak going back from today
    for (let i = 0; i < 30; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayData = logsByDate[dateStr];
      if (dayData && dayData.total > 0 && dayData.taken === dayData.total) {
        streak++;
      } else if (i === 0 && (!dayData || dayData.total === 0)) {
        // Today has no doses yet — don't break streak
        continue;
      } else {
        break;
      }
    }

    // Overall 30-day adherence %
    const { startDate: thirtyStart } = getDateRange(30);
    const thirtyLogsSnap = await db
      .collection('profiles')
      .doc(profileId)
      .collection('adherence_logs')
      .where('date', '>=', thirtyStart)
      .get();

    const thirtyLogs = thirtyLogsSnap.docs.map(d => d.data());
    const thirtyTaken = thirtyLogs.filter(l => l.status === 'taken').length;
    const thirtyTotal = thirtyLogs.length;
    const overallAdherence = thirtyTotal > 0 ? Math.round((thirtyTaken / thirtyTotal) * 100) : 100;

    res.json({
      success: true,
      data: {
        today: {
          date: today,
          status: todayStatus,
          taken: takenCount,
          total: totalExpected,
          missed: missedToday,
          rate: todayRate,
        },
        streak,
        adherencePercent: overallAdherence,
        missedCount: thirtyTotal - thirtyTaken,
      },
    });
  } catch (err) {
    console.error('[Adherence]', err);
    res.status(500).json({ success: false, error: 'Failed to fetch adherence data' });
  }
});

// ── GET /api/adherence/logs ────────────────────────────────────────────────────
router.get('/logs', auth, async (req, res) => {
  try {
    const { profileId } = req;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'startDate and endDate query params are required (YYYY-MM-DD)',
      });
    }

    const snap = await db
      .collection('profiles')
      .doc(profileId)
      .collection('adherence_logs')
      .where('date', '>=', startDate)
      .where('date', '<=', endDate)
      .orderBy('date', 'desc')
      .get();

    const logs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json({ success: true, data: { logs } });
  } catch (err) {
    console.error('[Adherence Logs]', err);
    res.status(500).json({ success: false, error: 'Failed to fetch adherence logs' });
  }
});

// ── GET /api/adherence/trends ──────────────────────────────────────────────────
router.get('/trends', auth, async (req, res) => {
  try {
    const { profileId } = req;
    const { period = 'weekly' } = req.query;
    const days = period === 'monthly' ? 30 : 7;
    const { startDate, endDate } = getDateRange(days);

    const snap = await db
      .collection('profiles')
      .doc(profileId)
      .collection('adherence_logs')
      .where('date', '>=', startDate)
      .where('date', '<=', endDate)
      .get();

    const logs = snap.docs.map(d => d.data());
    const dateList = datesBetween(startDate, endDate);

    const trends = dateList.map(date => {
      const dayLogs = logs.filter(l => l.date === date);
      const taken = dayLogs.filter(l => l.status === 'taken').length;
      const total = dayLogs.length;
      return {
        date,
        taken,
        total,
        missed: total - taken,
        rate: total > 0 ? Math.round((taken / total) * 100) : null,
      };
    });

    res.json({ success: true, data: { period, trends } });
  } catch (err) {
    console.error('[Adherence Trends]', err);
    res.status(500).json({ success: false, error: 'Failed to fetch trends' });
  }
});

module.exports = router;
