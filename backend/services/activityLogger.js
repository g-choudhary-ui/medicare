const { v4: uuidv4 } = require('uuid');
const { db } = require('./firebaseAdmin');

/**
 * Log an activity to the profile's activity_logs sub-collection
 *
 * @param {string} profileId - Target profile ID
 * @param {string} memberId - Member ID or Profile ID who performed action
 * @param {string} memberName - Name of the user / member
 * @param {string} action - Action code (e.g. MEDICATION_ADDED, DOSE_TAKEN)
 * @param {object} details - Metadata details regarding the action
 */
const logActivity = async (profileId, memberId, memberName, action, details = {}) => {
  if (!db || !profileId) return;

  try {
    const logId = uuidv4();
    const timestamp = new Date().toISOString();

    const activity = {
      profileId,
      memberId: memberId || 'system',
      memberName: memberName || 'System',
      action,
      details,
      timestamp,
      createdAt: timestamp,
    };

    await db
      .collection('profiles')
      .doc(profileId)
      .collection('activity_logs')
      .doc(logId)
      .set(activity);

    return { id: logId, ...activity };
  } catch (err) {
    console.error('[ActivityLogger] Failed to write log:', err.message);
    // Non-blocking logger: avoid throwing to prevent user request failure
    return null;
  }
};

/**
 * Fetch the latest N activity logs for a profile
 *
 * @param {string} profileId - Target profile ID
 * @param {number} limit - Maximum number of logs to retrieve (default: 50)
 */
const getActivityLogs = async (profileId, limit = 50) => {
  if (!db || !profileId) return [];

  try {
    const snap = await db
      .collection('profiles')
      .doc(profileId)
      .collection('activity_logs')
      .orderBy('timestamp', 'desc')
      .limit(Number(limit) || 50)
      .get();

    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (err) {
    console.error('[ActivityLogger] Failed to read logs:', err.message);
    return [];
  }
};

module.exports = {
  logActivity,
  getActivityLogs,
};
