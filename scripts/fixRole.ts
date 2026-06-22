import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import * as fs from 'fs';

const serviceAccount = JSON.parse(fs.readFileSync('./firebase-blueprint.json', 'utf8'));

// Only initialize if apps length is 0 to avoid duplicates in hot-reloading
if (firebase.apps.length === 0) {
  // We can't really do this easily without the real key in the app unless we run on cloud. Wait, I can run it via the applet or just write a small script...
}
