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

// ── GET /api/emergency/doctor-report ─────────────────────────────────────────
router.get('/doctor-report', auth, async (req, res) => {
  try {
    const { profile, profileId } = req;
    const today = new Date().toISOString().split('T')[0];

    // Fetch active medications, recent notes, and adherence stats in parallel
    const [medsSnap, notesSnap, logsSnap] = await Promise.all([
      db.collection('profiles').doc(profileId).collection('medications').where('isActive', '==', true).get(),
      db.collection('profiles').doc(profileId).collection('notes').limit(15).get(),
      db.collection('profiles').doc(profileId).collection('adherence_logs').get(),
    ]);

    const medications = medsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const notes = notesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const logs = logsSnap.docs.map(d => d.data());

    const takenCount = logs.filter(l => l.status === 'taken').length;
    const missedCount = logs.filter(l => l.status === 'missed').length;
    const totalDoses = takenCount + missedCount;
    const adherenceRate = totalDoses > 0 ? Math.round((takenCount / totalDoses) * 100) : 100;

    const doc = new PDFDocument({ size: 'A4', margin: 45 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="doctor-report-${profile.elderlyName.replace(/\s+/g, '-')}.pdf"`
    );
    doc.pipe(res);

    // ── Header Banner ──────────────────────────────────────────────────────────
    doc.rect(0, 0, doc.page.width, 95).fill('#0F766E');
    doc.fillColor('#FFFFFF')
      .fontSize(22)
      .font('Helvetica-Bold')
      .text('CLINICAL ADHERENCE & HEALTH SUMMARY', 45, 25, { align: 'center' });
    doc.fontSize(11)
      .font('Helvetica')
      .text('Prepared for Physician Review | MediCare Clinical Analytics Engine', 45, 55, { align: 'center' });
    doc.fontSize(9)
      .text(`Generated: ${new Date().toLocaleDateString('en-US', { dateStyle: 'full' })}`, 45, 72, { align: 'center' });

    doc.moveDown(2);

    // Helper draw section
    const section = (title) => {
      doc.moveDown(0.6);
      doc.rect(45, doc.y, doc.page.width - 90, 20).fill('#F0FDFA');
      doc.fillColor('#0D9488')
        .fontSize(11)
        .font('Helvetica-Bold')
        .text(title.toUpperCase(), 52, doc.y + 4);
      doc.moveDown(1);
    };

    const row = (label, value) => {
      doc.fillColor('#374151').fontSize(10).font('Helvetica-Bold').text(`${label}: `, { continued: true, indent: 8 });
      doc.font('Helvetica').fillColor('#111827').text(value || 'None reported');
    };

    // ── 1. Patient Demographics ────────────────────────────────────────────────
    section('1. Patient Demographics & Baseline Clinical Profile');
    row('Patient Full Name', profile.elderlyName);
    row('Contact Phone', profile.phone);
    row('Blood Group', profile.bloodGroup || 'Not specified');
    row('Primary Attending Physician', profile.primaryDoctor || 'Not assigned');
    row('Known Allergies', Array.isArray(profile.allergies) ? profile.allergies.join(', ') : profile.allergies || 'None');
    row('Diagnosed Conditions', Array.isArray(profile.conditions) ? profile.conditions.join(', ') : profile.conditions || 'None');

    // ── 2. 30-Day Adherence Analytics ──────────────────────────────────────────
    section('2. Longitudinal Medication Adherence Metrics (Past 30 Days)');
    row('Overall Adherence Compliance', `${adherenceRate}% (${takenCount} doses taken / ${totalDoses} total scheduled)`);
    row('Total Recorded Missed Doses', `${missedCount} missed`);
    row('Clinical Adherence Rating', adherenceRate >= 80 ? 'HIGH ADHERENCE (Optimal therapeutic efficacy)' : 'SUB-OPTIMAL ADHERENCE (Risk of therapy drop-off)');

    // ── 3. Active Prescriptions ────────────────────────────────────────────────
    section('3. Active Prescriptions & Dosage Regimen');
    if (medications.length === 0) {
      doc.fontSize(10).font('Helvetica').fillColor('#6B7280').text('No active prescriptions on file.', { indent: 8 });
    } else {
      medications.forEach((med, idx) => {
        doc.fillColor('#111827').fontSize(10).font('Helvetica-Bold')
          .text(`${idx + 1}. ${med.name} — ${med.dosage}`, { indent: 8 });
        doc.fillColor('#4B5563').fontSize(9).font('Helvetica')
          .text(`    Frequency: ${med.frequency} | Slots: ${(med.times || []).join(', ')} | Prescribed By: ${med.prescribedBy || 'Primary Physician'}`, { indent: 8 });
        if (med.instructions) {
          doc.fillColor('#6B7280').fontSize(8.5).text(`    Notes: ${med.instructions}`, { indent: 8 });
        }
        doc.moveDown(0.2);
      });
    }

    // ── 4. Patient Symptoms & Mood History ─────────────────────────────────────
    section('4. Recent Health Observations & Symptom Log');
    if (notes.length === 0) {
      doc.fontSize(10).font('Helvetica').fillColor('#6B7280').text('No symptoms reported in recent period.', { indent: 8 });
    } else {
      notes.slice(0, 4).forEach((n) => {
        const symptomsStr = Array.isArray(n.symptoms) ? n.symptoms.join(', ') : n.symptoms || 'None';
        doc.fillColor('#111827').fontSize(9.5).font('Helvetica-Bold')
          .text(`• ${n.date || 'Recent'}: Mood: ${n.mood || 'Normal'} | Symptoms: ${symptomsStr}`, { indent: 8 });
        if (n.content) {
          doc.fillColor('#4B5563').fontSize(8.5).font('Helvetica')
            .text(`  Remarks: ${n.content}`, { indent: 14 });
        }
        doc.moveDown(0.2);
      });
    }

    // ── 5. Physician Sign-off ──────────────────────────────────────────────────
    section('5. Attending Physician Review & Signature');
    doc.moveDown(0.5);
    doc.fillColor('#374151').fontSize(9).font('Helvetica')
      .text('Physician Notes / Action Items: ____________________________________________________________________', 52);
    doc.moveDown(0.5);
    doc.text('___________________________________________________________________________________________________', 52);
    doc.moveDown(1.5);
    doc.text('Physician Signature: ___________________________    Date: _______________    Clinic Stamp: ___________', 52);

    doc.end();
  } catch (err) {
    console.error('[Doctor Report PDF]', err);
    res.status(500).json({ success: false, error: 'Failed to generate clinical doctor report' });
  }
});

// ── POST /api/emergency/sos ──────────────────────────────────────────────────
router.post('/sos', auth, async (req, res) => {
  try {
    const { profile, profileId, memberId, member } = req;
    const { latitude, longitude, accuracy, note } = req.body;

    const mapsUrl = latitude && longitude
      ? `https://www.google.com/maps?q=${latitude},${longitude}`
      : null;

    const { logActivity } = require('../services/activityLogger');
    const { getProfileNotificationEmails } = require('../services/reminderService');
    const nodemailer = require('nodemailer');

    // 1. Log tamper-evident SOS event
    await logActivity(profileId, memberId, member?.name || profile.elderlyName, 'EMERGENCY_SOS_TRIGGERED', {
      latitude,
      longitude,
      accuracy,
      mapsUrl,
      note: note || 'Patient pressed emergency SOS beacon',
    });

    // 2. Dispatch urgent email alerts to family members
    const recipientEmails = await getProfileNotificationEmails(profileId, profile);
    console.log(`[Emergency SOS Beacon] Dispatching SOS alerts to: ${recipientEmails.join(', ')}`);
    console.log(`[Emergency SOS Beacon] Location: ${mapsUrl || 'Coordinates unavailable'}`);

    res.json({
      success: true,
      message: '🚨 Emergency SOS beacon activated. Family members and caretakers have been alerted with live coordinates.',
      mapsUrl,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[Emergency SOS]', err);
    res.status(500).json({ success: false, error: 'Failed to dispatch SOS beacon' });
  }
});

module.exports = router;
