import { registerAs } from '@nestjs/config';

export default registerAs('firebase', () => ({
  /** Full service-account JSON as a single-line string */
  serviceAccountJson: process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim() || '',
  projectId: process.env.FIREBASE_PROJECT_ID?.trim() || '',
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL?.trim() || '',
  /** Private key with \n escaped as \\n in .env */
  privateKey: (process.env.FIREBASE_PRIVATE_KEY ?? '')
    .replace(/\\n/g, '\n')
    .trim(),
}));
