const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const Joi = require('joi');
const { db } = require('../services/firebaseAdmin');
const auth = require('../middleware/auth');
const { logActivity } = require('../services/activityLogger');

// ── Validation Schema ──────────────────────────────────────────────────────────
const appointmentSchema = Joi.object({
  doctorName: Joi.string().min(1).max(150).required(),
  specialty: Joi.string().max(100).optional().allow('', null),
  date: Joi.string().max(50).required(),
  time: Joi.string().max(50).optional().allow('', null),
  location: Joi.string().max(300).optional().allow('', null),
  notes: Joi.string().max(1000).optional().allow('', null),
  reminderEnabled: Joi.boolean().default(true),
  appointmentType: Joi.string().valid('in-person','virtual','phone').default('in-person'),
  followUpDate: Joi.string().max(50).optional().allow('', null),
});

// ── GET /api/appointments ──────────────────────────────────────────────────────
router.get('/', auth, async (req, res) => {
  try {
    const { profileId } = req;
    const { filter = 'all' } = req.query;
    const today = new Date().toISOString().split('T')[0];

    let query = db
      .collection('profiles')
      .doc(profileId)
      .collection('appointments')
      .where('isActive', '==', true);

    const snap = await query.get();
    let appointments = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    // In-memory sort to avoid requiring composite indexes in Firestore
    appointments.sort((a, b) => (a.date || '').localeCompare(b.date || ''));

    if (filter === 'upcoming') {
      appointments = appointments.filter(a => (a.date || '') >= today);
    } else if (filter === 'past') {
      appointments = appointments.filter(a => (a.date || '') < today);
    }

    res.json({ success: true, data: { appointments } });
  } catch (err) {
    console.error('[Appointments Get]', err);
    res.status(500).json({ success: false, error: err.message, message: 'Failed to fetch appointments' });
  }
});

// ── POST /api/appointments ─────────────────────────────────────────────────────
router.post('/', auth, async (req, res) => {
  try {
    const { error, value } = appointmentSchema.validate(req.body, { abortEarly: false });
    if (error) {
      const msg = error.details.map(d => d.message).join(', ');
      return res.status(400).json({
        success: false,
        error: msg,
        message: msg,
      });
    }

    const { profileId, memberId, member } = req;
    const apptId = uuidv4();
    const now = new Date().toISOString();

    const apptData = {
      ...value,
      isActive: true,
      createdAt: now,
      updatedAt: now,
      createdBy: memberId,
      reminderSent: false,
    };

    await db
      .collection('profiles')
      .doc(profileId)
      .collection('appointments')
      .doc(apptId)
      .set(apptData);

    await logActivity(profileId, memberId, member.name, 'APPOINTMENT_ADDED', {
      appointmentId: apptId,
      doctorName: value.doctorName,
      date: value.date,
      time: value.time,
    });

    res.status(201).json({
      success: true,
      data: { appointment: { id: apptId, ...apptData } },
    });
  } catch (err) {
    console.error('[Appointments Post]', err);
    res.status(500).json({ success: false, error: 'Failed to add appointment' });
  }
});

// ── PUT /api/appointments/:id ──────────────────────────────────────────────────
router.put('/:id', auth, async (req, res) => {
  try {
    const updateSchema = appointmentSchema.fork(
      ['doctorName', 'date', 'time'],
      field => field.optional()
    );
    const { error, value } = updateSchema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details.map(d => d.message).join(', '),
      });
    }

    const { profileId, memberId, member } = req;
    const { id } = req.params;

    const apptRef = db
      .collection('profiles')
      .doc(profileId)
      .collection('appointments')
      .doc(id);

    const snap = await apptRef.get();
    if (!snap.exists || !snap.data().isActive) {
      return res.status(404).json({ success: false, error: 'Appointment not found' });
    }

    const updates = {
      ...value,
      updatedAt: new Date().toISOString(),
      reminderSent: false, // reset if date/time changed
    };
    await apptRef.update(updates);

    await logActivity(profileId, memberId, member.name, 'APPOINTMENT_UPDATED', {
      appointmentId: id,
      changes: Object.keys(value),
    });

    res.json({ success: true, data: { appointment: { id, ...snap.data(), ...updates } } });
  } catch (err) {
    console.error('[Appointments Put]', err);
    res.status(500).json({ success: false, error: 'Failed to update appointment' });
  }
});

// ── DELETE /api/appointments/:id ───────────────────────────────────────────────
router.delete('/:id', auth, async (req, res) => {
  try {
    const { profileId, memberId, member } = req;
    const { id } = req.params;

    const apptRef = db
      .collection('profiles')
      .doc(profileId)
      .collection('appointments')
      .doc(id);

    const snap = await apptRef.get();
    if (!snap.exists) {
      return res.status(404).json({ success: false, error: 'Appointment not found' });
    }

    await apptRef.update({ isActive: false, deletedAt: new Date().toISOString() });

    await logActivity(profileId, memberId, member.name, 'APPOINTMENT_DELETED', {
      appointmentId: id,
      doctorName: snap.data().doctorName,
    });

    res.json({ success: true, data: { message: 'Appointment deleted successfully' } });
  } catch (err) {
    console.error('[Appointments Delete]', err);
    res.status(500).json({ success: false, error: 'Failed to delete appointment' });
  }
});

module.exports = router;
