import {
  Injectable,
  Logger,
  OnModuleInit,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

@Injectable()
export class FirebaseAdminService implements OnModuleInit {
  private readonly logger = new Logger(FirebaseAdminService.name);
  private app: App | null = null;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    if (getApps().length) {
      this.app = getApps()[0]!;
      return;
    }

    const json = this.config.get<string>('firebase.serviceAccountJson');
    const projectId = this.config.get<string>('firebase.projectId');
    const clientEmail = this.config.get<string>('firebase.clientEmail');
    const privateKey = this.config.get<string>('firebase.privateKey');

    try {
      if (json) {
        const serviceAccount = JSON.parse(json) as {
          projectId?: string;
          project_id?: string;
          clientEmail?: string;
          client_email?: string;
          privateKey?: string;
          private_key?: string;
        };
        this.app = initializeApp({
          credential: cert({
            projectId: serviceAccount.projectId ?? serviceAccount.project_id,
            clientEmail: serviceAccount.clientEmail ?? serviceAccount.client_email,
            privateKey: serviceAccount.privateKey ?? serviceAccount.private_key,
          }),
        });
      } else if (projectId && clientEmail && privateKey) {
        this.app = initializeApp({
          credential: cert({ projectId, clientEmail, privateKey }),
        });
      }
    } catch (e) {
      this.logger.error(
        `Firebase Admin init failed: ${e instanceof Error ? e.message : e}`,
      );
      this.app = null;
    }

    if (this.app) {
      this.logger.log('Firebase Admin ready (phone ID token verification)');
    } else {
      this.logger.warn(
        'Firebase Admin not configured — set FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY',
      );
    }
  }

  isReady() {
    return this.app != null;
  }

  async verifyIdToken(idToken: string): Promise<{ uid: string; phone: string }> {
    if (!this.app) {
      throw new ServiceUnavailableException(
        'Firebase phone verification is not configured on the server',
      );
    }
    try {
      const decoded = await getAuth(this.app).verifyIdToken(idToken);
      const phone = decoded.phone_number?.trim();
      if (!phone) {
        throw new UnauthorizedException('Firebase token has no phone number');
      }
      return { uid: decoded.uid, phone };
    } catch (e) {
      if (
        e instanceof UnauthorizedException ||
        e instanceof ServiceUnavailableException
      ) {
        throw e;
      }
      throw new UnauthorizedException('Invalid Firebase ID token');
    }
  }
}
