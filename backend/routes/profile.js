const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const Joi = require('joi');
const { db } = require('../services/firebaseAdmin');
const auth = require('../middleware/auth');
const { logActivity, getActivityLogs } = require('../services/activityLogger');
const { sendWelcomeEmail } = require('../services/emailService');

// ── Helpers ────────────────────────────────────────────────────────────────────
const generatePasscode = (len = 6) => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < len; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
};

// ── Validation Schemas ─────────────────────────────────────────────────────────
const createSchema = Joi.object({
  elderlyName: Joi.string().min(2).max(100).required(),
  email: Joi.string().email().required(),
  phone: Joi.string().optional().allow('', null),
  bloodGroup: Joi.string().valid('A+','A-','B+','B-','AB+','AB-','O+','O-','Unknown').default('Unknown'),
  allergies: Joi.array().items(Joi.string().max(100)).default([]),
  conditions: Joi.array().items(Joi.string().max(200)).default([]),
  emergencyContact: Joi.object({
    name: Joi.string().max(100).optional().allow('', null),
    phone: Joi.string().max(30).optional().allow('', null),
    relationship: Joi.string().max(50).default('Family'),
  }).optional().default({ name: '', phone: '', relationship: 'Family' }),
  dateOfBirth: Joi.string().optional().allow('', null),
  address: Joi.string().max(300).optional().allow('', null),
  primaryDoctor: Joi.string().max(100).optional().allow('', null),
});

const joinSchema = Joi.object({
  profileId: Joi.string().required(),
  passcode: Joi.string().required(),
  role: Joi.string().valid('caretaker', 'family', 'doctor').required(),
  name: Joi.string().min(2).max(100).required(),
  email: Joi.string().email().required(),
  phone: Joi.string().pattern(/^[+\d\s\-().]{7,20}$/).optional(),
});

const updateSchema = Joi.object({
  elderlyName: Joi.string().min(2).max(100).optional(),
  email: Joi.string().email().optional(),
  phone: Joi.string().pattern(/^[+\d\s\-().]{7,20}$/).optional(),
  bloodGroup: Joi.string().valid('A+','A-','B+','B-','AB+','AB-','O+','O-','Unknown').optional(),
  allergies: Joi.array().items(Joi.string().max(100)).optional(),
  conditions: Joi.array().items(Joi.string().max(200)).optional(),
  emergencyContact: Joi.object({
    name: Joi.string().min(2).max(100).optional(),
    phone: Joi.string().pattern(/^[+\d\s\-().]{7,20}$/).optional(),
    relationship: Joi.string().max(50).optional(),
  }).optional(),
  dateOfBirth: Joi.string().optional(),
  address: Joi.string().max(300).optional(),
  primaryDoctor: Joi.string().max(100).optional(),
});

// ── POST /api/profile/create ───────────────────────────────────────────────────
router.post('/create', async (req, res) => {
  try {
    const { error, value } = createSchema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details.map(d => d.message).join(', '),
      });
    }

    const plainPasscode = generatePasscode(6);
    const passcodeHash = await bcrypt.hash(plainPasscode, 12);
    const profileId = uuidv4();
    const now = new Date().toISOString();

    const profileData = {
      ...value,
      passcodeHash,
      createdAt: now,
      updatedAt: now,
      isActive: true,
    };

    await db.collection('profiles').doc(profileId).set(profileData);

    // Send welcome email (non-blocking)
    sendWelcomeEmail(value.email, value.elderlyName, plainPasscode, profileId).catch(err =>
      console.error('[Email] Welcome email failed:', err.message)
    );

    await logActivity(profileId, profileId, value.elderlyName, 'PROFILE_CREATED', {
      elderlyName: value.elderlyName,
    });

    const { passcodeHash: _, ...safeProfile } = profileData;

    res.status(201).json({
      success: true,
      data: {
        profileId,
        passcode: plainPasscode,
        profile: { ...safeProfile, id: profileId },
        message: 'Profile created successfully. Save your passcode — it will not be shown again.',
      },
    });
  } catch (err) {
    console.error('[Profile Create]', err);
    res.status(500).json({ success: false, error: 'Failed to create profile' });
  }
});

// ── POST /api/profile/join ─────────────────────────────────────────────────────
router.post('/join', async (req, res) => {
  try {
    const { error, value } = joinSchema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details.map(d => d.message).join(', '),
      });
    }

    const { profileId, passcode, role, name, email, phone } = value;

    // Fetch profile
    const profileSnap = await db.collection('profiles').doc(profileId).get();
    if (!profileSnap.exists) {
      return res.status(404).json({ success: false, error: 'Profile not found' });
    }

    const profileData = profileSnap.data();
    const isValid = await bcrypt.compare(passcode, profileData.passcodeHash);
    if (!isValid) {
      return res.status(401).json({ success: false, error: 'Invalid passcode' });
    }

    const memberId = uuidv4();
    const now = new Date().toISOString();

    const memberData = {
      name,
      email,
      phone: phone || '',
      role,
      joinedAt: now,
      isActive: true,
    };

    await db
      .collection('profiles')
      .doc(profileId)
      .collection('members')
      .doc(memberId)
      .set(memberData);

    await logActivity(profileId, memberId, name, 'MEMBER_JOINED', { role, name, email });

    const { passcodeHash: _, ...safeProfile } = profileData;

    res.status(200).json({
      success: true,
      data: {
        memberId,
        profileId,
        passcode,
        role,
        profile: { ...safeProfile, id: profileId },
        member: { id: memberId, name, role, email },
        message: `Successfully joined profile as ${role}`,
      },
    });
  } catch (err) {
    console.error('[Profile Join]', err);
    res.status(500).json({ success: false, error: 'Failed to join profile' });
  }
});

// ── GET /api/profile ───────────────────────────────────────────────────────────
router.get('/', auth, async (req, res) => {
  try {
    const { profile, profileId } = req;

    // Fetch members sub-collection
    const membersSnap = await db
      .collection('profiles')
      .doc(profileId)
      .collection('members')
      .where('isActive', '==', true)
      .get();

    const members = membersSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    // Strip sensitive fields before returning
    const { passcodeHash, ...safeProfile } = profile;

    res.json({
      success: true,
      data: {
        profile: { ...safeProfile, id: profileId },
        members,
        currentMember: req.memberId
          ? (members.find(m => m.id === req.memberId) || { id: req.memberId, role: 'member', name: safeProfile.elderlyName })
          : { id: profileId, role: 'owner', name: safeProfile.elderlyName },
      },
    });
  } catch (err) {
    console.error('[Profile Get]', err);
    res.status(500).json({ success: false, error: 'Failed to fetch profile' });
  }
});

// ── PUT /api/profile ───────────────────────────────────────────────────────────
router.put('/', auth, async (req, res) => {
  try {
    const { error, value } = updateSchema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details.map(d => d.message).join(', '),
      });
    }

    const { profileId, memberId, member } = req;
    const updates = { ...value, updatedAt: new Date().toISOString() };

    await db.collection('profiles').doc(profileId).update(updates);
    await logActivity(profileId, memberId, member.name, 'PROFILE_UPDATED', { fields: Object.keys(value) });

    res.json({ success: true, data: { message: 'Profile updated successfully' } });
  } catch (err) {
    console.error('[Profile Update]', err);
    res.status(500).json({ success: false, error: 'Failed to update profile' });
  }
});

// ── GET /api/profile/members ───────────────────────────────────────────────────
router.get('/members', auth, async (req, res) => {
  try {
    const membersSnap = await db
      .collection('profiles')
      .doc(req.profileId)
      .collection('members')
      .where('isActive', '==', true)
      .orderBy('joinedAt', 'asc')
      .get();

    const members = membersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json({ success: true, data: { members } });
  } catch (err) {
    console.error('[Members List]', err);
    res.status(500).json({ success: false, error: 'Failed to fetch members' });
  }
});

// ── GET /api/profile/activity ──────────────────────────────────────────────────
router.get('/activity', auth, async (req, res) => {
  try {
    const { profileId } = req;
    const { limit = 30 } = req.query;
    const logs = await getActivityLogs(profileId, limit);
    res.json({ success: true, data: { activityLogs: logs } });
  } catch (err) {
    console.error('[Profile Activity]', err);
    res.status(500).json({ success: false, error: 'Failed to fetch activity logs' });
  }
});

// ── DELETE /api/profile/members/:memberId ──────────────────────────────────────
router.delete('/members/:memberId', auth, async (req, res) => {
  try {
    const { profileId, memberId: callerMemberId, member } = req;
    const { memberId: targetMemberId } = req.params;

    // Only owner (profileId === memberId) can remove members
    if (callerMemberId !== profileId) {
      return res.status(403).json({ success: false, error: 'Only the profile owner can remove members' });
    }

    const memberRef = db
      .collection('profiles')
      .doc(profileId)
      .collection('members')
      .doc(targetMemberId);

    const snap = await memberRef.get();
    if (!snap.exists) {
      return res.status(404).json({ success: false, error: 'Member not found' });
    }

    await memberRef.update({ isActive: false, removedAt: new Date().toISOString() });

    await logActivity(profileId, callerMemberId, member.name, 'MEMBER_REMOVED', {
      removedMemberId: targetMemberId,
    });

    res.json({ success: true, data: { message: 'Member removed successfully' } });
  } catch (err) {
    console.error('[Member Remove]', err);
    res.status(500).json({ success: false, error: 'Failed to remove member' });
  }
});

module.exports = router;
