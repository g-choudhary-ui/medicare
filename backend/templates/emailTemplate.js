/**
 * MediCare Email Templates
 * Accessible, medical design with large typography (min 18px body font),
 * high contrast, soothing teal (#0F766E, #14B8A6) and clear call-to-actions.
 */

const baseWrapper = (title, contentHtml) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #F0FDFA;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #1F2937;
      font-size: 18px;
      line-height: 1.6;
    }
    .container {
      max-width: 600px;
      margin: 20px auto;
      background: #FFFFFF;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 20px rgba(15, 118, 110, 0.08);
      border: 1px solid #CCFBF1;
    }
    .header {
      background: linear-gradient(135deg, #0F766E 0%, #14B8A6 100%);
      padding: 32px 24px;
      text-align: center;
      color: #FFFFFF;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 800;
      letter-spacing: -0.5px;
    }
    .header p {
      margin: 8px 0 0 0;
      font-size: 18px;
      opacity: 0.95;
    }
    .body-content {
      padding: 32px 24px;
    }
    .btn {
      display: inline-block;
      background-color: #0F766E;
      color: #FFFFFF !important;
      text-decoration: none;
      padding: 16px 32px;
      border-radius: 10px;
      font-size: 20px;
      font-weight: 700;
      margin-top: 24px;
      text-align: center;
    }
    .badge {
      display: inline-block;
      padding: 6px 14px;
      background-color: #CCFBF1;
      color: #0F766E;
      font-size: 16px;
      font-weight: 700;
      border-radius: 8px;
    }
    .alert-box {
      background-color: #FEF2F2;
      border: 2px solid #F87171;
      border-radius: 12px;
      padding: 20px;
      margin: 20px 0;
    }
    .info-card {
      background-color: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 12px;
      padding: 20px;
      margin: 20px 0;
    }
    .footer {
      background-color: #F8FAFC;
      border-top: 1px solid #E2E8F0;
      padding: 24px;
      text-align: center;
      font-size: 15px;
      color: #64748B;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🏥 MediCare</h1>
      <p>Elderly Care & Medication Management</p>
    </div>
    <div class="body-content">
      ${contentHtml}
    </div>
    <div class="footer">
      <p>This automated message was sent by MediCare Platform.</p>
      <p>For urgent medical assistance, call emergency services immediately.</p>
    </div>
  </div>
</body>
</html>
`;

/**
 * 1. Medication Reminder Email (30 mins before dose)
 */
const getMedicationReminderTemplate = (medicationName, timeSlot, profileName, dosage = '') => {
  const content = `
    <h2 style="color: #0F766E; font-size: 24px; margin-top: 0;">⏰ Upcoming Medication Reminder</h2>
    <p>Hello,</p>
    <p>This is a gentle reminder that <strong>${profileName}</strong> is scheduled to take medication soon.</p>
    
    <div class="info-card">
      <div style="font-size: 22px; font-weight: 700; color: #0F766E; margin-bottom: 8px;">
        💊 ${medicationName}
      </div>
      ${dosage ? `<p style="margin: 4px 0; font-size: 18px;"><strong>Dosage:</strong> ${dosage}</p>` : ''}
      <p style="margin: 4px 0; font-size: 18px;"><strong>Scheduled Time Slot:</strong> <span class="badge">${timeSlot.toUpperCase()}</span></p>
    </div>

    <p style="font-size: 18px;">
      Please ensure the dose is taken on time with water or as prescribed by the doctor.
    </p>

    <div style="text-align: center;">
      <a href="${process.env.FRONTEND_URL || 'http://localhost:8080'}/medications" class="btn">
        ✅ Mark Dose as Taken
      </a>
    </div>
  `;
  return baseWrapper('Medication Reminder - MediCare', content);
};

/**
 * 2. Missed Dose Alert Email
 */
const getMissedDoseAlertTemplate = (medicationName, profileName, timeSlot = '') => {
  const content = `
    <h2 style="color: #DC2626; font-size: 24px; margin-top: 0;">⚠️ Missed Medication Alert</h2>
    <p>Attention Family & Caretaker,</p>
    
    <div class="alert-box">
      <p style="color: #991B1B; font-weight: 700; font-size: 20px; margin: 0 0 10px 0;">
        Dose Not Recorded
      </p>
      <p style="color: #7F1D1D; font-size: 18px; margin: 0;">
        The scheduled dose of <strong>${medicationName}</strong> for <strong>${profileName}</strong>
        ${timeSlot ? `(${timeSlot} slot)` : ''} has not been recorded as taken.
      </p>
    </div>

    <p style="font-size: 18px;">
      Please check on <strong>${profileName}</strong> to ensure their wellbeing and confirm whether the medication was administered.
    </p>

    <div style="text-align: center;">
      <a href="${process.env.FRONTEND_URL || 'http://localhost:8080'}/dashboard" class="btn" style="background-color: #DC2626;">
        🔍 Check MediCare Dashboard
      </a>
    </div>
  `;
  return baseWrapper('ALERT: Missed Medication - MediCare', content);
};

/**
 * 3. Appointment Reminder Email (24h before)
 */
const getAppointmentReminderTemplate = (appointment, profileName) => {
  const content = `
    <h2 style="color: #0F766E; font-size: 24px; margin-top: 0;">📅 Doctor's Appointment Reminder</h2>
    <p>Hello,</p>
    <p>This is a reminder of an upcoming medical appointment for <strong>${profileName}</strong> scheduled for tomorrow:</p>
    
    <div class="info-card">
      <div style="font-size: 22px; font-weight: 700; color: #0F766E; margin-bottom: 8px;">
        👨‍⚕️ ${appointment.doctorName}
      </div>
      ${appointment.specialty ? `<p style="margin: 4px 0;"><strong>Specialty:</strong> ${appointment.specialty}</p>` : ''}
      <p style="margin: 4px 0;"><strong>Date:</strong> ${appointment.date}</p>
      <p style="margin: 4px 0;"><strong>Time:</strong> ${appointment.time}</p>
      ${appointment.location ? `<p style="margin: 4px 0;"><strong>Location:</strong> ${appointment.location}</p>` : ''}
      ${appointment.notes ? `<p style="margin: 4px 0;"><strong>Notes:</strong> ${appointment.notes}</p>` : ''}
    </div>

    <p style="font-size: 18px;">
      Tip: Remember to carry medical records, current prescriptions, and the MediCare Emergency Card.
    </p>

    <div style="text-align: center;">
      <a href="${process.env.FRONTEND_URL || 'http://localhost:8080'}/appointments" class="btn">
        📋 View Appointment Details
      </a>
    </div>
  `;
  return baseWrapper('Appointment Reminder - MediCare', content);
};

/**
 * 4. Daily Morning Digest (8:00 AM)
 */
const getDailyDigestTemplate = (medications, profileName) => {
  const medItemsHtml = (medications && medications.length > 0)
    ? medications.map(m => `
        <li style="margin-bottom: 12px; font-size: 18px;">
          <strong>${m.name}</strong> (${m.dosage || 'Standard dose'}) —
          <span style="color: #0F766E; font-weight: 600;">${(m.times || []).join(', ')}</span>
        </li>
      `).join('')
    : '<li style="font-size: 18px;">No medications scheduled for today.</li>';

  const content = `
    <h2 style="color: #0F766E; font-size: 24px; margin-top: 0;">🌅 Good Morning! Daily Medication Digest</h2>
    <p>Here is the medication schedule for <strong>${profileName}</strong> today:</p>
    
    <div class="info-card">
      <ul style="padding-left: 20px; margin: 0;">
        ${medItemsHtml}
      </ul>
    </div>

    <p style="font-size: 18px;">
      Have a healthy and pleasant day ahead!
    </p>

    <div style="text-align: center;">
      <a href="${process.env.FRONTEND_URL || 'http://localhost:8080'}/dashboard" class="btn">
        📱 Open MediCare Dashboard
      </a>
    </div>
  `;
  return baseWrapper('Daily Medication Schedule - MediCare', content);
};

/**
 * 5. Welcome Email (Profile Created)
 */
const getWelcomeEmailTemplate = (profileName, passcode, profileId) => {
  const content = `
    <h2 style="color: #0F766E; font-size: 24px; margin-top: 0;">🎉 Welcome to MediCare!</h2>
    <p>Hello,</p>
    <p>A new care profile has been created for <strong>${profileName}</strong>.</p>
    
    <div class="info-card" style="border: 2px solid #0F766E; background-color: #F0FDFA;">
      <p style="font-size: 16px; color: #64748B; margin: 0 0 6px 0; text-transform: uppercase; font-weight: 700;">
        Your Care Passcode
      </p>
      <div style="font-size: 32px; font-weight: 900; letter-spacing: 4px; color: #0F766E; font-family: monospace;">
        ${passcode}
      </div>
      <p style="font-size: 14px; color: #64748B; margin: 12px 0 0 0;">
        Profile ID: <code>${profileId}</code>
      </p>
    </div>

    <p style="font-size: 18px;">
      <strong>Important:</strong> Keep this passcode safe. Caretakers and family members need both the Profile ID and this Passcode to join and access the profile.
    </p>

    <div style="text-align: center;">
      <a href="${process.env.FRONTEND_URL || 'http://localhost:8080'}/dashboard" class="btn">
        🚀 Get Started Now
      </a>
    </div>
  `;
  return baseWrapper('Welcome to MediCare - Profile Created', content);
};

module.exports = {
  getMedicationReminderTemplate,
  getMissedDoseAlertTemplate,
  getAppointmentReminderTemplate,
  getDailyDigestTemplate,
  getWelcomeEmailTemplate,
};
