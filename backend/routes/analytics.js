const express = require('express');
const router = express.Router();
const { db } = require('../services/firebaseAdmin');
const auth = require('../middleware/auth');

const getDateRange = (days) => {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - (days - 1));
  return {
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0],
  };
};

const datesBetween = (startStr, endStr) => {
  const dates = [];
  const start = new Date(startStr);
  const end = new Date(endStr);
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
};

// ── GET /api/analytics/dashboard ──────────────────────────────────────────────
router.get('/dashboard', auth, async (req, res) => {
  try {
    const { profileId } = req;
    const today = new Date().toISOString().split('T')[0];
    const { startDate: weekStart } = getDateRange(7);
    const { startDate: thirtyStart } = getDateRange(30);

    // Parallel fetches (in-memory filtering avoids composite index requirements)
    const [medsSnap, apptSnap, thirtyLogsSnap, weekLogsSnap] = await Promise.all([
      db.collection('profiles').doc(profileId).collection('medications').where('isActive', '==', true).get(),
      db.collection('profiles').doc(profileId).collection('appointments').where('isActive', '==', true).get(),
      db.collection('profiles').doc(profileId).collection('adherence_logs').where('date', '>=', thirtyStart).get(),
      db.collection('profiles').doc(profileId).collection('adherence_logs').where('date', '>=', weekStart).get(),
    ]);

    const totalMedications = medsSnap.size;
    const upcomingAppointments = apptSnap.docs.filter(d => (d.data().date || '') >= today).length;

    const thirtyLogs = thirtyLogsSnap.docs.map(d => d.data());
    const thirtyTaken = thirtyLogs.filter(l => l.status === 'taken').length;
    const adherencePercent = thirtyLogs.length > 0
      ? Math.round((thirtyTaken / thirtyLogs.length) * 100)
      : 100;

    const weekLogs = weekLogsSnap.docs.map(d => d.data());
    const missedThisWeek = weekLogs.filter(l => l.status === 'missed').length;

    // Streak calculation
    let streak = 0;
    const logsByDate = {};
    thirtyLogs.forEach(l => {
      if (!logsByDate[l.date]) logsByDate[l.date] = { taken: 0, total: 0 };
      logsByDate[l.date].total++;
      if (l.status === 'taken') logsByDate[l.date].taken++;
    });
    for (let i = 0; i < 30; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayData = logsByDate[dateStr];
      if (i === 0 && (!dayData || dayData.total === 0)) continue;
      if (dayData && dayData.total > 0 && dayData.taken === dayData.total) streak++;
      else break;
    }

    res.json({
      success: true,
      data: {
        adherencePercent,
        streak,
        upcomingAppointments,
        totalMedications,
        missedThisWeek,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error('[Analytics Dashboard]', err);
    res.status(500).json({ success: false, error: 'Failed to fetch dashboard analytics' });
  }
});

// ── GET /api/analytics/adherence-chart ────────────────────────────────────────
router.get('/adherence-chart', auth, async (req, res) => {
  try {
    const { profileId } = req;
    const { startDate, endDate } = getDateRange(30);

    const snap = await db
      .collection('profiles')
      .doc(profileId)
      .collection('adherence_logs')
      .where('date', '>=', startDate)
      .where('date', '<=', endDate)
      .get();

    const logs = snap.docs.map(d => d.data());
    const dateList = datesBetween(startDate, endDate);

    const labels = [];
    const takenData = [];
    const missedData = [];
    const rateData = [];

    dateList.forEach(date => {
      const dayLogs = logs.filter(l => l.date === date);
      const taken = dayLogs.filter(l => l.status === 'taken').length;
      const total = dayLogs.length;
      const missed = total - taken;

      // Short date label
      const d = new Date(date + 'T00:00:00');
      labels.push(`${d.getMonth() + 1}/${d.getDate()}`);
      takenData.push(taken);
      missedData.push(missed);
      rateData.push(total > 0 ? Math.round((taken / total) * 100) : null);
    });

    // Chart.js-compatible structure
    const chartData = {
      labels,
      datasets: [
        {
          label: 'Taken',
          data: takenData,
          backgroundColor: 'rgba(20, 184, 166, 0.7)',
          borderColor: '#14B8A6',
          borderWidth: 2,
        },
        {
          label: 'Missed',
          data: missedData,
          backgroundColor: 'rgba(239, 68, 68, 0.6)',
          borderColor: '#EF4444',
          borderWidth: 2,
        },
      ],
      rateData,
    };

    res.json({ success: true, data: { chart: chartData, startDate, endDate } });
  } catch (err) {
    console.error('[Analytics Chart]', err);
    res.status(500).json({ success: false, error: 'Failed to fetch chart data' });
  }
});

// ── GET /api/analytics/missed-meds ────────────────────────────────────────────
router.get('/missed-meds', auth, async (req, res) => {
  try {
    const { profileId } = req;
    const { startDate } = getDateRange(30);

    const snap = await db
      .collection('profiles')
      .doc(profileId)
      .collection('adherence_logs')
      .where('date', '>=', startDate)
      .where('status', '==', 'missed')
      .get();

    const missedLogs = snap.docs.map(d => d.data());

    // Count misses per medication
    const missCount = {};
    missedLogs.forEach(log => {
      const key = log.medicationId;
      if (!missCount[key]) {
        missCount[key] = { medicationId: key, medicationName: log.medicationName, count: 0 };
      }
      missCount[key].count++;
    });

    const sortedMissed = Object.values(missCount).sort((a, b) => b.count - a.count);

    res.json({
      success: true,
      data: { missedMedications: sortedMissed, period: '30 days' },
    });
  } catch (err) {
    console.error('[Analytics Missed Meds]', err);
    res.status(500).json({ success: false, error: 'Failed to fetch missed medications' });
  }
});

module.exports = router;
