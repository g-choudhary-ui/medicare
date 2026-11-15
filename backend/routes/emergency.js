const express = require('express');
const router = express.Router();
const PDFDocument = require('pdfkit');
const { db } = require('../services/firebaseAdmin');
const auth = require('../middleware/auth');

// ── GET /api/emergency ─────────────────────────────────────────────────────────
router.get('/', auth, async (req, res) => {
  try {
    const { profile, profileId } = req;
    const today = new Date().toISOString().split('T')[0];

    // Active medications
    const medsSnap = await db
      .collection('profiles')
      .doc(profileId)
      .collection('medications')
      .where('isActive', '==', true)
      .get();

    const medications = medsSnap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(med => !med.endDate || med.endDate >= today);

    const { passcodeHash, ...safeProfile } = profile;

    res.json({
      success: true,
      data: {
        emergencyCard: {
          name: safeProfile.elderlyName,
          bloodGroup: safeProfile.bloodGroup,
          allergies: safeProfile.allergies || [],
          conditions: safeProfile.conditions || [],
          emergencyContact: safeProfile.emergencyContact,
          primaryDoctor: safeProfile.primaryDoctor || '',
          dateOfBirth: safeProfile.dateOfBirth || '',
          phone: safeProfile.phone,
          currentMedications: medications.map(m => ({
            name: m.name,
            dosage: m.dosage,
            frequency: m.frequency,
            prescribedBy: m.prescribedBy || '',
            instructions: m.instructions || '',
          })),
        },
      },
    });
  } catch (err) {
    console.error('[Emergency Get]', err);
    res.status(500).json({ success: false, error: 'Failed to fetch emergency info' });
  }
});

// ── GET /api/emergency/pdf ─────────────────────────────────────────────────────
router.get('/pdf', auth, async (req, res) => {
  try {
    const { profile, profileId } = req;
    const today = new Date().toISOString().split('T')[0];

    const medsSnap = await db
      .collection('profiles')
      .doc(profileId)
      .collection('medications')
      .where('isActive', '==', true)
      .get();

    const medications = medsSnap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(med => !med.endDate || med.endDate >= today);

    // Create PDF
    const doc = new PDFDocument({ size: 'A4', margin: 50 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="emergency-card-${profile.elderlyName.replace(/\s+/g, '-')}.pdf"`
    );
    doc.pipe(res);

    // ── Header ──────────────────────────────────────────────────────────────────
    doc.rect(0, 0, doc.page.width, 100).fill('#14B8A6');
    doc.fillColor('#FFFFFF')
      .fontSize(28)
      .font('Helvetica-Bold')
      .text('🏥 MEDICAL EMERGENCY CARD', 50, 30, { align: 'center' });
    doc.fontSize(14)
      .font('Helvetica')
      .text('MediCare — Elderly Care Platform', 50, 68, { align: 'center' });

    doc.moveDown(2);

    // ── Patient Info ────────────────────────────────────────────────────────────
    const drawSection = (title, yStart) => {
      doc.rect(50, doc.y, doc.page.width - 100, 24).fill('#E0F2F1');
      doc.fillColor('#0F766E')
        .fontSize(14)
        .font('Helvetica-Bold')
        .text(title, 60, doc.y + 5);
      doc.moveDown(1.5);
    };

    const drawRow = (label, value) => {
      doc.fillColor('#1F2937').fontSize(12).font('Helvetica-Bold').text(`${label}: `, {
        continued: true,
        indent: 10,
      });
      doc.font('Helvetica').fillColor('#374151').text(value || 'N/A');
    };

    drawSection('👤 Patient Information');
    drawRow('Name', profile.elderlyName);
    drawRow('Date of Birth', profile.dateOfBirth || 'N/A');
    drawRow('Phone', profile.phone);
    drawRow('Blood Group', profile.bloodGroup);

    doc.moveDown(0.5);
    drawSection('⚠️ Allergies');
    if (profile.allergies && profile.allergies.length > 0) {
      profile.allergies.forEach(a => {
        doc.fillColor('#DC2626').fontSize(12).font('Helvetica-Bold').text(`• ${a}`, { indent: 10 });
      });
    } else {
      drawRow('Allergies', 'None known');
    }

    doc.moveDown(0.5);
    drawSection('🩺 Medical Conditions');
    if (profile.conditions && profile.conditions.length > 0) {
      profile.conditions.forEach(c => {
        doc.fillColor('#1E40AF').fontSize(12).font('Helvetica').text(`• ${c}`, { indent: 10 });
      });
    } else {
      drawRow('Conditions', 'None on record');
    }

    doc.moveDown(0.5);
    drawSection('💊 Current Medications');
    if (medications.length > 0) {
      medications.forEach((med, idx) => {
        doc.fillColor('#1F2937').fontSize(11).font('Helvetica-Bold')
          .text(`${idx + 1}. ${med.name} — ${med.dosage}`, { indent: 10 });
        doc.fillColor('#6B7280').fontSize(10).font('Helvetica')
          .text(`   Frequency: ${med.frequency} | Times: ${med.times.join(', ')}`, { indent: 10 });
        if (med.instructions) {
          doc.text(`   Instructions: ${med.instructions}`, { indent: 10 });
        }
        doc.moveDown(0.3);
      });
    } else {
      drawRow('Medications', 'None on record');
    }

    doc.moveDown(0.5);
    drawSection('📞 Emergency Contact');
    if (profile.emergencyContact) {
      drawRow('Name', profile.emergencyContact.name);
      drawRow('Phone', profile.emergencyContact.phone);
      drawRow('Relationship', profile.emergencyContact.relationship || 'Family');
    }

    if (profile.primaryDoctor) {
      doc.moveDown(0.5);
      drawSection('👨‍⚕️ Primary Physician');
      drawRow('Doctor', profile.primaryDoctor);
    }

    // ── Footer ──────────────────────────────────────────────────────────────────
    doc.moveDown(2);
    doc.rect(50, doc.y, doc.page.width - 100, 1).fill('#14B8A6');
    doc.moveDown(0.5);
    doc.fillColor('#6B7280').fontSize(10).font('Helvetica')
      .text(
        `Generated by MediCare on ${new Date().toLocaleString()} | In case of emergency, please contact the person listed above.`,
        50, doc.y, { align: 'center' }
      );

    doc.end();
  } catch (err) {
    console.error('[Emergency PDF]', err);
    res.status(500).json({ success: false, error: 'Failed to generate PDF' });
  }
});

module.exports = router;
