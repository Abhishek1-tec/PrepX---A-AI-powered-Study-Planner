/**
 * File storage: Firebase Storage when configured; otherwise local uploads/ folder.
 */
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.join(__dirname, '../../uploads');

let bucket = null;
export async function initStorage() {
  if (bucket !== null) return bucket;
  if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_STORAGE_BUCKET) return null;
  try {
    const admin = await import('firebase-admin');
    if (!admin.default.apps.length) {
      admin.default.initializeApp({
        credential: admin.default.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
        }),
      });
    }
    const { getStorage } = await import('firebase-admin/storage');
    bucket = getStorage().bucket(process.env.FIREBASE_STORAGE_BUCKET);
  } catch (_) {
    bucket = false;
  }
  return bucket || null;
}

export async function uploadFile(buffer, fileName, mimeType, folder = 'notes') {
  const safeName = `${folder}/${Date.now()}-${(fileName || 'file').replace(/[^a-zA-Z0-9.-]/g, '_')}`;
  const b = await initStorage();
  if (b) {
    const file = b.file(safeName);
    await file.save(buffer, { metadata: { contentType: mimeType }, resumable: false });
    const [url] = await file.getSignedUrl({ action: 'read', expires: '03-01-2500' });
    return url;
  }
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  const localPath = path.join(UPLOAD_DIR, safeName);
  await fs.mkdir(path.dirname(localPath), { recursive: true });
  await fs.writeFile(localPath, buffer);
  return `/uploads/${safeName}`;
}
