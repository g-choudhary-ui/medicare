const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const Joi = require('joi');
const { db } = require('../services/firebaseAdmin');
const auth = require('../middleware/auth');
const { logActivity } = require('../services/activityLogger');

// ── Validation Schema ──────────────────────────────────────────────────────────
const noteSchema = Joi.object({
  date: Joi.string().isoDate().required(),
  content: Joi.string().min(1).max(2000).required(),
  mood: Joi.string().valid('happy', 'good', 'neutral', 'sad', 'pain', 'anxious', 'tired').default('good'),
  symptoms: Joi.array().items(Joi.string().max(100)).default([]),
});

// ── GET /api/notes ─────────────────────────────────────────────────────────────
router.get('/', auth, async (req, res) => {
  try {
    const { profileId } = req;
    const { startDate, endDate } = req.query;

    let query = db
      .collection('profiles')
      .doc(profileId)
      .collection('notes')
      .where('isActive', '==', true);

    if (startDate && endDate) {
      query = query.where('date', '>=', startDate).where('date', '<=', endDate);
    }

    const snap = await query.orderBy('date', 'desc').get();
    const notes = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    res.json({
      success: true,
      data: { notes },
    });
  } catch (err) {
    console.error('[Notes Get]', err);
    res.status(500).json({ success: false, error: 'Failed to fetch notes' });
  }
});

// ── POST /api/notes ────────────────────────────────────────────────────────────
router.post('/', auth, async (req, res) => {
  try {
    const { error, value } = noteSchema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details.map(d => d.message).join(', '),
      });
    }

    const { profileId, memberId, member } = req;
    const noteId = uuidv4();
    const now = new Date().toISOString();

    const noteData = {
      ...value,
      isActive: true,
      createdAt: now,
      updatedAt: now,
      authorId: memberId,
      authorName: member.name,
      authorRole: member.role || 'member',
    };

    await db
      .collection('profiles')
      .doc(profileId)
      .collection('notes')
      .doc(noteId)
      .set(noteData);

    await logActivity(profileId, memberId, member.name, 'NOTE_ADDED', {
      noteId,
      mood: value.mood,
      date: value.date,
    });

    res.status(201).json({
      success: true,
      data: { note: { id: noteId, ...noteData } },
    });
  } catch (err) {
    console.error('[Notes Post]', err);
    res.status(500).json({ success: false, error: 'Failed to save note' });
  }
});

// ── DELETE /api/notes/:id ──────────────────────────────────────────────────────
router.delete('/:id', auth, async (req, res) => {
  try {
    const { profileId, memberId, member } = req;
    const { id } = req.params;

    const noteRef = db
      .collection('profiles')
      .doc(profileId)
      .collection('notes')
      .doc(id);

    const snap = await noteRef.get();
    if (!snap.exists) {
      return res.status(404).json({ success: false, error: 'Note not found' });
    }

    await noteRef.update({
      isActive: false,
      deletedAt: new Date().toISOString(),
    });

    await logActivity(profileId, memberId, member.name, 'NOTE_DELETED', {
      noteId: id,
    });

    res.json({
      success: true,
      data: { message: 'Note deleted successfully' },
    });
  } catch (err) {
    console.error('[Notes Delete]', err);
    res.status(500).json({ success: false, error: 'Failed to delete note' });
  }
});

module.exports = router;
