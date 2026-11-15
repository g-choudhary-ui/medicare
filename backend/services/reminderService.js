const cron = require('node-cron');
const { v4: uuidv4 } = require('uuid');
const { db } = require('./firebaseAdmin');
const {
  sendMedicationReminder,
  sendMissedDoseAlert,
  sendAppointmentReminder,
  sendDailyDigest,
} = require('./emailService');
const { logActivity } = require('./activityLogger');

/**
 * Standard scheduled times for slots (24-hour clock)
 */
const TIME_SLOT_CONFIG = {
  morning: { hour: 8, minute: 0, label: 'Morning' },
  afternoon: { hour: 13, minute: 0, label: 'Afternoon' },
  evening: { hour: 18, minute: 0, label: 'Evening' },
  night: { hour: 21, minute: 0, label: 'Night' },
};

/**
 * Helper to fetch all emails associated with a profile (patient + active members)
 */
const getProfileNotificationEmails = async (profileId, profileData) => {
  const emails = new Set();
  if (profileData && profileData.email) {
    emails.add(profileData.email);
  }

  if (db && profileId) {
    try {
      const membersSnap = await db
        .collection('profiles')
        .doc(profileId)
        .collection('members')
        .where('isActive', '==', true)
        .get();

      membersSnap.forEach(doc => {
        const data = doc.data();
        if (data.email) emails.add(data.email);
      });
    } catch (err) {
      console.error(`[ReminderService] Error fetching members for ${profileId}:`, err.message);
    }
  }

  return Array.from(emails);
};

/**
 * Check if a reminder log already exists in Firestore
 */
const hasReminderBeenSent = async (profileId, reminderKey) => {
  if (!db) return true;
  try {
    const doc = await db
      .collection('profiles')
      .doc(profileId)
      .collection('reminder_logs')
      .doc(reminderKey)
      .get();
    return doc.exists;
  } catch (err) {
    console.error(`[ReminderService] Error checking reminder log ${reminderKey}:`, err.message);
    return false;
  }
};

/**
 * Record a reminder log in Firestore to avoid duplicate notifications
 */
const recordReminderSent = async (profileId, reminderKey, type, metadata = {}) => {
  if (!db) return;
  try {
    await db
      .collection('profiles')
      .doc(profileId)
      .collection('reminder_logs')
      .doc(reminderKey)
      .set({
        reminderKey,
        type,
        metadata,
        sentAt: new Date().toISOString(),
      });
  } catch (err) {
    console.error(`[ReminderService] Error saving reminder log ${reminderKey}:`, err.message);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// CRON JOB 1 & 2: Runs every minute
// - Check medications due in next 30 minutes (send reminder)
// - Check medications past due time (mark as missed, send alert)
// ─────────────────────────────────────────────────────────────────────────────
const checkMedicationSchedule = async () => {
  if (!db) return;

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const currentTotalMinutes = now.getHours() * 60 + now.getMinutes();

  try {
    const profilesSnap = await db.collection('profiles').where('isActive', '==', true).get();

    for (const profileDoc of profilesSnap.docs) {
      const profileId = profileDoc.id;
      const profile = profileDoc.data();

      // Fetch active medications for profile
      const medsSnap = await db
        .collection('profiles')
        .doc(profileId)
        .collection('medications')
        .where('isActive', '==', true)
        .get();

      if (medsSnap.empty) continue;

      const recipientEmails = await getProfileNotificationEmails(profileId, profile);

      for (const medDoc of medsSnap.docs) {
        const medId = medDoc.id;
        const med = medDoc.data();

        // Check if medication is currently active today
        if (med.startDate > todayStr) continue;
        if (med.endDate && med.endDate < todayStr) continue;
        if (med.reminderEnabled === false) continue;

        const times = med.times || [];

        for (const slot of times) {
          const slotCfg = TIME_SLOT_CONFIG[slot];
          if (!slotCfg) continue;

          const slotTotalMinutes = slotCfg.hour * 60 + slotCfg.minute;
          const diffMinutes = slotTotalMinutes - currentTotalMinutes;

          // 1. Upcoming dose: Due within 0 to 30 minutes
          if (diffMinutes >= 0 && diffMinutes <= 30) {
            const reminderKey = `upcoming_${todayStr}_${medId}_${slot}`;
            const alreadySent = await hasReminderBeenSent(profileId, reminderKey);

            if (!alreadySent) {
              await sendMedicationReminder(
                recipientEmails,
                med.name,
                slotCfg.label,
                profile.elderlyName
              );
              await recordReminderSent(profileId, reminderKey, 'UPCOMING_MED_REMINDER', {
                medicationId: medId,
                medicationName: med.name,
                slot,
                date: todayStr,
              });
              await logActivity(profileId, 'system', 'MediCare Reminder', 'REMINDER_SENT', {
                medicationId: medId,
                medicationName: med.name,
                slot,
              });
            }
          }

          // 2. Overdue dose: 60+ minutes past slot time, not recorded as taken
          const overdueThresholdMinutes = 60; // 1 hour past scheduled time
          if (currentTotalMinutes - slotTotalMinutes >= overdueThresholdMinutes) {
            const missedKey = `missed_${todayStr}_${medId}_${slot}`;
            const alreadyProcessed = await hasReminderBeenSent(profileId, missedKey);

            if (!alreadyProcessed) {
              // Check if taken log exists
              const takenSnap = await db
                .collection('profiles')
                .doc(profileId)
                .collection('adherence_logs')
                .where('medicationId', '==', medId)
                .where('date', '==', todayStr)
                .where('timeSlot', '==', slot)
                .where('status', '==', 'taken')
                .get();

              if (takenSnap.empty) {
                // Log as missed in adherence_logs
                const logId = uuidv4();
                await db
                  .collection('profiles')
                  .doc(profileId)
                  .collection('adherence_logs')
                  .doc(logId)
                  .set({
                    medicationId: medId,
                    medicationName: med.name,
                    date: todayStr,
                    timeSlot: slot,
                    status: 'missed',
                    missedAt: now.toISOString(),
                    loggedBy: 'system',
                  });

                // Alert family/caretakers
                await sendMissedDoseAlert(recipientEmails, med.name, profile.elderlyName);
                await recordReminderSent(profileId, missedKey, 'MISSED_DOSE_ALERT', {
                  medicationId: medId,
                  medicationName: med.name,
                  slot,
                  date: todayStr,
                });
                await logActivity(profileId, 'system', 'MediCare System', 'MEDICATION_MISSED', {
                  medicationId: medId,
                  medicationName: med.name,
                  slot,
                });
              }
            }
          }
        }
      }
    }
  } catch (err) {
    console.error('[ReminderService] Error in checkMedicationSchedule:', err.message);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// CRON JOB 3: 8:00 AM Daily Morning Digest
// ─────────────────────────────────────────────────────────────────────────────
const sendMorningDigests = async () => {
  if (!db) return;
  console.log('[ReminderService] Running 8:00 AM daily digest...');
  const todayStr = new Date().toISOString().split('T')[0];

  try {
    const profilesSnap = await db.collection('profiles').where('isActive', '==', true).get();

    for (const profileDoc of profilesSnap.docs) {
      const profileId = profileDoc.id;
      const profile = profileDoc.data();

      const medsSnap = await db
        .collection('profiles')
        .doc(profileId)
        .collection('medications')
        .where('isActive', '==', true)
        .get();

      const todayMeds = medsSnap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(m => m.startDate <= todayStr && (!m.endDate || m.endDate >= todayStr));

      const digestKey = `digest_${todayStr}`;
      const alreadySent = await hasReminderBeenSent(profileId, digestKey);

      if (!alreadySent) {
        const emails = await getProfileNotificationEmails(profileId, profile);
        await sendDailyDigest(emails, todayMeds, profile.elderlyName);
        await recordReminderSent(profileId, digestKey, 'DAILY_DIGEST', {
          date: todayStr,
          medicationCount: todayMeds.length,
        });
      }
    }
  } catch (err) {
    console.error('[ReminderService] Error in sendMorningDigests:', err.message);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// CRON JOB 4: Hourly Appointment Reminder (next 24 hours)
// ─────────────────────────────────────────────────────────────────────────────
const checkAppointmentReminders = async () => {
  if (!db) return;
  console.log('[ReminderService] Running hourly appointment check...');

  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];
  const todayStr = now.toISOString().split('T')[0];

  try {
    const profilesSnap = await db.collection('profiles').where('isActive', '==', true).get();

    for (const profileDoc of profilesSnap.docs) {
      const profileId = profileDoc.id;
      const profile = profileDoc.data();

      const apptsSnap = await db
        .collection('profiles')
        .doc(profileId)
        .collection('appointments')
        .where('isActive', '==', true)
        .where('reminderEnabled', '==', true)
        .where('reminderSent', '==', false)
        .get();

      if (apptsSnap.empty) continue;

      const emails = await getProfileNotificationEmails(profileId, profile);

      for (const apptDoc of apptsSnap.docs) {
        const apptId = apptDoc.id;
        const appt = apptDoc.data();

        // Check if appointment date falls on today or tomorrow
        if (appt.date === todayStr || appt.date === tomorrowStr) {
          const reminderKey = `appt_reminder_${apptId}_${appt.date}`;
          const alreadySent = await hasReminderBeenSent(profileId, reminderKey);

          if (!alreadySent) {
            await sendAppointmentReminder(emails, appt, profile.elderlyName);
            await apptDoc.ref.update({
              reminderSent: true,
              reminderSentAt: new Date().toISOString(),
            });
            await recordReminderSent(profileId, reminderKey, 'APPOINTMENT_REMINDER', {
              appointmentId: apptId,
              date: appt.date,
            });
            await logActivity(profileId, 'system', 'MediCare System', 'APPOINTMENT_REMINDER_SENT', {
              appointmentId: apptId,
              doctorName: appt.doctorName,
            });
          }
        }
      }
    }
  } catch (err) {
    console.error('[ReminderService] Error in checkAppointmentReminders:', err.message);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// SCHEDULE CRON TASKS
// ─────────────────────────────────────────────────────────────────────────────
// 1. Every minute: Medication schedule check (due in 30 mins & past due missed)
cron.schedule('* * * * *', () => {
  checkMedicationSchedule();
});

// 2. 8:00 AM daily: Morning medication digest
cron.schedule('0 8 * * *', () => {
  sendMorningDigests();
});

// 3. Hourly (at minute 0): Check appointments in next 24 hrs
cron.schedule('0 * * * *', () => {
  checkAppointmentReminders();
});

console.log('[ReminderService] Cron jobs initialized:');
console.log('  - Every minute: Medication check (due soon / missed)');
console.log('  - Daily at 08:00: Morning digest');
console.log('  - Hourly: Appointments within 24 hours');

module.exports = {
  checkMedicationSchedule,
  sendMorningDigests,
  checkAppointmentReminders,
};
