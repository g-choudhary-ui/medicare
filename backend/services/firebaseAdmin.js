const admin = require('firebase-admin');

/**
 * Initialize Firebase Admin SDK using environment variables:
 * - FIREBASE_PROJECT_ID
 * - FIREBASE_CLIENT_EMAIL
 * - FIREBASE_PRIVATE_KEY (handles escaped newlines: \n -> newline)
 *
 * Supports both local dev credentials and Google Cloud Run default credentials.
 */
if (!admin.apps.length) {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (privateKey) {
    privateKey = privateKey.replace(/\\n/g, '\n');
  }

  if (projectId && clientEmail && privateKey) {
    try {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
      console.log(`[FirebaseAdmin] Initialized with Service Account for project: ${projectId}`);
    } catch (err) {
      console.error('[FirebaseAdmin] Error initializing with Service Account:', err.message);
    }
  } else {
    // Cloud Run / GCP Environment credentials fallback
    try {
      admin.initializeApp();
      console.log('[FirebaseAdmin] Initialized with Application Default Credentials');
    } catch (err) {
      console.warn('[FirebaseAdmin] Warning: Initialized without explicit credentials. Ensure GCP Default Credentials or FIREBASE_* env vars are set:', err.message);
    }
  }
}

let db;
try {
  db = admin.firestore();
  // Set Firestore settings for optimal performance
  db.settings({ ignoreUndefinedProperties: true });
} catch (err) {
  console.error('[FirebaseAdmin] Failed to initialize Firestore db:', err.message);
}

module.exports = {
  admin,
  db,
};
