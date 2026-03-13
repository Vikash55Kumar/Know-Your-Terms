import dotenv from 'dotenv';
import admin from 'firebase-admin';
dotenv.config();

// const serviceAccount = require("./serviceAccountKey.json");
const firebaseConfigStr = process.env.FIREBASE_CONFIG1;

if (!firebaseConfigStr) {
  throw new Error(
    'Missing FIREBASE_CONFIG1 environment variable. ' +
    'Set it to your Firebase service account JSON as a single-line minified string in your .env file. ' +
    'See HELO.md for setup instructions.'
  );
}

let serviceAccount: admin.ServiceAccount;
try {
  serviceAccount = JSON.parse(firebaseConfigStr);
} catch (e) {
  throw new Error(
    'Invalid FIREBASE_CONFIG1: could not parse as JSON. ' +
    'Ensure the value is a valid, single-line minified JSON string (no newlines). ' +
    'See HELO.md for setup instructions.'
  );
}

if (!admin.apps.length) {
    const connected = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });

    if (connected) {
        console.log(`✅ Firebase connected successfully`);
    } else {
        console.error(`❌ Failed to connect to Firebase`);
        throw new Error("Failed to initialize Firebase");
    }
}


export const db = admin.firestore();
export const auth = admin.auth();

export default admin;
