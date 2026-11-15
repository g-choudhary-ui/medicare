const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const Joi = require('joi');
const { db } = require('../services/firebaseAdmin');
const auth = require('../middleware/auth');
const { logActivity } = require('../services/activityLogger');

// ── Validation Schemas ─────────────────────────────────────────────────────────
const medicationSchema = Joi.object({
  name: Joi.string().min(1).max(200).required(),
  dosage: Joi.string().min(1).max(100).required(),
  frequency: Joi.string().valid(
    'daily', 'once_daily',
    'twice daily', 'twice_daily',
    'thrice daily', 'thrice_daily',
    'four_times_daily',
    'weekly',
    'as needed', 'as_needed',
    'custom'
  ).required(),
  times: Joi.array()
    .items(Joi.string().valid('morning','afternoon','evening','night'))
    .min(1)
    .required(),
  startDate: Joi.string().isoDate().required(),
  endDate: Joi.string().isoDate().optional().allow('', null),
  color: Joi.string().max(20).default('#14B8A6'),
  instructions: Joi.string().max(500).optional().allow('', null),
  prescribedBy: Joi.string().max(100).optional().allow('', null),
  reminderEnabled: Joi.boolean().default(true),
  stock: Joi.number().integer().min(0).optional(),
});

const takeSchema = Joi.object({
  timeSlot: Joi.string().valid('morning','afternoon','evening','night').required(),
  takenAt: Joi.string().isoDate().optional(),
  note: Joi.string().max(300).optional().allow('', null),
});

// Time slot → approximate 24h time (for reminder calculations)
const TIME_SLOT_HOURS = {
  morning: 8,
  afternoon: 13,
  evening: 18,
  night: 21,
};

// ── GET /api/medications ───────────────────────────────────────────────────────
router.get('/', auth, async (req, res) => {
  try {
    const { profileId } = req;
    const { active } = req.query;

    let query = db.collection('profiles').doc(profileId).collection('medications');

    if (active === 'true') {
      const today = new Date().toISOString().split('T')[0];
      query = query.where('isActive', '==', true);
    } else {
      query = query.where('isActive', '==', true);
    }

    const snap = await query.get();
    let medications = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    medications.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

    // For each medication, attach today's taken status
    const today = new Date().toISOString().split('T')[0];
    const enriched = await Promise.all(
      medications.map(async med => {
        const logsSnap = await db
          .collection('profiles')
          .doc(profileId)
          .collection('adherence_logs')
          .where('medicationId', '==', med.id)
          .where('date', '==', today)
          .get();
        const takenSlots = logsSnap.docs
          .filter(d => d.data().status === 'taken')
          .map(d => d.data().timeSlot);
        return { ...med, todayTaken: takenSlots };
      })
    );

    res.json({ success: true, data: { medications: enriched } });
  } catch (err) {
    console.error('[Medications Get]', err);
    res.status(500).json({ success: false, error: 'Failed to fetch medications' });
  }
});

// ── POST /api/medications ──────────────────────────────────────────────────────
router.post('/', auth, async (req, res) => {
  try {
    const { error, value } = medicationSchema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details.map(d => d.message).join(', '),
      });
    }

    const { profileId, memberId, member } = req;
    const medId = uuidv4();
    const now = new Date().toISOString();

    const medData = {
      ...value,
      isActive: true,
      createdAt: now,
      updatedAt: now,
      createdBy: memberId,
    };

    await db.collection('profiles').doc(profileId).collection('medications').doc(medId).set(medData);

    await logActivity(profileId, memberId, member.name, 'MEDICATION_ADDED', {
      medicationId: medId,
      medicationName: value.name,
      dosage: value.dosage,
    });

    res.status(201).json({
      success: true,
      data: { medication: { id: medId, ...medData } },
    });
  } catch (err) {
    console.error('[Medications Post]', err);
    res.status(500).json({ success: false, error: 'Failed to add medication' });
  }
});

// ── PUT /api/medications/:id ───────────────────────────────────────────────────
router.put('/:id', auth, async (req, res) => {
  try {
    const updateSchema = medicationSchema.fork(
      ['name','dosage','frequency','times','startDate'],
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

    const medRef = db.collection('profiles').doc(profileId).collection('medications').doc(id);
    const snap = await medRef.get();
    if (!snap.exists || !snap.data().isActive) {
      return res.status(404).json({ success: false, error: 'Medication not found' });
    }

    const updates = { ...value, updatedAt: new Date().toISOString() };
    await medRef.update(updates);

    await logActivity(profileId, memberId, member.name, 'MEDICATION_UPDATED', {
      medicationId: id,
      medicationName: snap.data().name,
      changes: Object.keys(value),
    });

    res.json({ success: true, data: { medication: { id, ...snap.data(), ...updates } } });
  } catch (err) {
    console.error('[Medications Put]', err);
    res.status(500).json({ success: false, error: 'Failed to update medication' });
  }
});

// ── DELETE /api/medications/:id ────────────────────────────────────────────────
router.delete('/:id', auth, async (req, res) => {
  try {
    const { profileId, memberId, member } = req;
    const { id } = req.params;

    const medRef = db.collection('profiles').doc(profileId).collection('medications').doc(id);
    const snap = await medRef.get();
    if (!snap.exists) {
      return res.status(404).json({ success: false, error: 'Medication not found' });
    }

    await medRef.update({ isActive: false, deletedAt: new Date().toISOString() });

    await logActivity(profileId, memberId, member.name, 'MEDICATION_DELETED', {
      medicationId: id,
      medicationName: snap.data().name,
    });

    res.json({ success: true, data: { message: 'Medication deleted successfully' } });
  } catch (err) {
    console.error('[Medications Delete]', err);
    res.status(500).json({ success: false, error: 'Failed to delete medication' });
  }
});

// ── POST /api/medications/:id/take ────────────────────────────────────────────
router.post('/:id/take', auth, async (req, res) => {
  try {
    const { error, value } = takeSchema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details.map(d => d.message).join(', '),
      });
    }

    const { profileId, memberId, member } = req;
    const { id: medicationId } = req.params;
    const { timeSlot, note } = value;

    // Verify medication exists
    const medRef = db.collection('profiles').doc(profileId).collection('medications').doc(medicationId);
    const medSnap = await medRef.get();
    if (!medSnap.exists || !medSnap.data().isActive) {
      return res.status(404).json({ success: false, error: 'Medication not found' });
    }

    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();

    // Check if already taken for this slot today
    const existingSnap = await db
      .collection('profiles')
      .doc(profileId)
      .collection('adherence_logs')
      .where('medicationId', '==', medicationId)
      .where('date', '==', today)
      .where('timeSlot', '==', timeSlot)
      .where('status', '==', 'taken')
      .get();

    if (!existingSnap.empty) {
      return res.status(409).json({
        success: false,
        error: 'Dose already marked as taken for this time slot today',
      });
    }

    const logId = uuidv4();
    const logData = {
      medicationId,
      medicationName: medSnap.data().name,
      date: today,
      timeSlot,
      status: 'taken',
      takenAt: now,
      takenBy: memberId,
      takenByName: member.name,
      note: note || '',
    };

    await db
      .collection('profiles')
      .doc(profileId)
      .collection('adherence_logs')
      .doc(logId)
      .set(logData);

    await logActivity(profileId, memberId, member.name, 'MEDICATION_TAKEN', {
      medicationId,
      medicationName: medSnap.data().name,
      timeSlot,
      date: today,
    });

    res.json({
      success: true,
      data: { log: { id: logId, ...logData } },
    });
  } catch (err) {
    console.error('[Medications Take]', err);
    res.status(500).json({ success: false, error: 'Failed to record dose' });
  }
});

module.exports = router;
