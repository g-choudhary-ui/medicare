const nodemailer = require('nodemailer');
const {
  getMedicationReminderTemplate,
  getMissedDoseAlertTemplate,
  getAppointmentReminderTemplate,
  getDailyDigestTemplate,
  getWelcomeEmailTemplate,
} = require('../templates/emailTemplate');

/**
 * Configure Nodemailer transporter with Gmail SMTP
 */
const createTransporter = () => {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (!user || !pass) {
    console.warn('[EmailService] EMAIL_USER or EMAIL_PASS not set in environment. Outgoing emails will be logged only.');
    return null;
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user,
      pass,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
};

const transporter = createTransporter();

/**
 * Helper to dispatch email to a recipient or array of recipients
 */
const sendMailHelper = async ({ to, subject, html, text }) => {
  const recipients = Array.isArray(to) ? to.filter(Boolean).join(', ') : to;

  if (!recipients) {
    console.log('[EmailService] No recipient provided, skipping email.');
    return { success: false, error: 'No recipient' };
  }

  if (!transporter) {
    console.log(`[EmailService MOCK SEND] To: ${recipients} | Subject: "${subject}"`);
    return { success: true, mocked: true };
  }

  try {
    const fromAddress = process.env.EMAIL_FROM || `MediCare <${process.env.EMAIL_USER}>`;
    const info = await transporter.sendMail({
      from: fromAddress,
      to: recipients,
      subject,
      html,
      text: text || subject,
    });
    console.log(`[EmailService] Sent "${subject}" to ${recipients}. MessageId: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error(`[EmailService] Failed to send email "${subject}" to ${recipients}:`, err.message);
    return { success: false, error: err.message };
  }
};

/**
 * 1. Medication Reminder (approx 30 mins before dose slot)
 */
const sendMedicationReminder = async (emails, medicationName, time, profileName) => {
  const subject = `⏰ Medication Reminder: ${medicationName} for ${profileName}`;
  const html = getMedicationReminderTemplate(medicationName, time, profileName);
  return sendMailHelper({ to: emails, subject, html });
};

/**
 * 2. Missed Dose Alert
 */
const sendMissedDoseAlert = async (emails, medicationName, profileName) => {
  const subject = `⚠️ Alert: Missed Dose of ${medicationName} for ${profileName}`;
  const html = getMissedDoseAlertTemplate(medicationName, profileName);
  return sendMailHelper({ to: emails, subject, html });
};

/**
 * 3. Doctor's Appointment Reminder (24 hours prior)
 */
const sendAppointmentReminder = async (emails, appointment, profileName) => {
  const subject = `📅 Appointment Reminder: Dr. ${appointment.doctorName} tomorrow for ${profileName}`;
  const html = getAppointmentReminderTemplate(appointment, profileName);
  return sendMailHelper({ to: emails, subject, html });
};

/**
 * 4. Morning Daily Digest (8:00 AM)
 */
const sendDailyDigest = async (emails, medications, profileName) => {
  const subject = `🌅 Today's Medication Schedule for ${profileName}`;
  const html = getDailyDigestTemplate(medications, profileName);
  return sendMailHelper({ to: emails, subject, html });
};

/**
 * 5. Welcome Email on Profile Creation
 */
const sendWelcomeEmail = async (email, profileName, passcode, profileId) => {
  const subject = `🏥 Welcome to MediCare - Passcode for ${profileName}`;
  const html = getWelcomeEmailTemplate(profileName, passcode, profileId);
  return sendMailHelper({ to: email, subject, html });
};

module.exports = {
  sendMedicationReminder,
  sendMissedDoseAlert,
  sendAppointmentReminder,
  sendDailyDigest,
  sendWelcomeEmail,
};
