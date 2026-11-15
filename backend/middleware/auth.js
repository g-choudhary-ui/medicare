const bcrypt = require('bcryptjs');
const { db } = require('../services/firebaseAdmin');

/**
 * Auth middleware — reads x-profile-id and x-passcode headers,
 * verifies against Firestore, and attaches req.profile + req.memberId.
 */
const auth = async (req, res, next) => {
  try {
    const profileId = req.headers['x-profile-id'];
    const passcode = req.headers['x-passcode'];

    if (!profileId || !passcode) {
      return res.status(401).json({
        success: false,
        error: 'Missing x-profile-id or x-passcode headers',
      });
    }

    // Fetch profile document
    const profileRef = db.collection('profiles').doc(profileId);
    const profileSnap = await profileRef.get();

    if (!profileSnap.exists) {
      return res.status(401).json({ success: false, error: 'Profile not found' });
    }

    const profile = { id: profileSnap.id, ...profileSnap.data() };

    // Verify passcode
    const isValid = await bcrypt.compare(passcode, profile.passcodeHash);
    if (!isValid) {
      return res.status(401).json({ success: false, error: 'Invalid passcode' });
    }

    // Attach profile and use profileId as memberId for owner
    req.profile = profile;
    req.profileId = profileId;

    // Optionally identify the calling member via x-member-id header
    const memberId = req.headers['x-member-id'];
    if (memberId) {
      // Verify member belongs to this profile
      const memberSnap = await db
        .collection('profiles')
        .doc(profileId)
        .collection('members')
        .doc(memberId)
        .get();

      if (!memberSnap.exists) {
        return res.status(401).json({ success: false, error: 'Member not found in this profile' });
      }
      req.memberId = memberId;
      req.member = { id: memberSnap.id, ...memberSnap.data() };
    } else {
      // Owner access — memberId === profileId
      req.memberId = profileId;
      req.member = {
        id: profileId,
        name: profile.elderlyName,
        role: 'owner',
        email: profile.email,
      };
    }

    next();
  } catch (err) {
    console.error('[Auth Middleware]', err);
    res.status(500).json({ success: false, error: 'Authentication error' });
  }
};

module.exports = auth;
