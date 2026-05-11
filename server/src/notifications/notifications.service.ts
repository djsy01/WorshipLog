import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';

@Injectable()
export class NotificationsService implements OnModuleInit {
  private readonly logger = new Logger(NotificationsService.name);
  private initialized = false;

  constructor(private config: ConfigService) {}

  onModuleInit() {
    const projectId = this.config.get<string>('FIREBASE_PROJECT_ID');
    const clientEmail = this.config.get<string>('FIREBASE_CLIENT_EMAIL');
    const privateKey = this.config.get<string>('FIREBASE_PRIVATE_KEY');
    if (!projectId || !clientEmail || !privateKey) {
      this.logger.warn('Firebase credentials not set — push notifications disabled');
      return;
    }
    try {
      if (!admin.apps.length) {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey: privateKey.replace(/\\n/g, '\n'),
          }),
        });
      }
      this.initialized = true;
    } catch (e) {
      this.logger.error('Firebase init failed', e);
    }
  }

  async sendToToken(token: string, title: string, body: string, data?: Record<string, string>) {
    if (!this.initialized) return;
    try {
      await admin.messaging().send({
        token,
        notification: { title, body },
        data,
        android: { priority: 'high', notification: { sound: 'default' } },
        apns: { payload: { aps: { sound: 'default', badge: 1 } } },
      });
    } catch (e) {
      this.logger.warn(`FCM send failed for token ${token.slice(0, 10)}…: ${e}`);
    }
  }

  async sendToTokens(tokens: string[], title: string, body: string, data?: Record<string, string>) {
    if (!this.initialized || tokens.length === 0) return;
    const chunks: string[][] = [];
    for (let i = 0; i < tokens.length; i += 500) {
      chunks.push(tokens.slice(i, i + 500));
    }
    for (const chunk of chunks) {
      try {
        await admin.messaging().sendEachForMulticast({
          tokens: chunk,
          notification: { title, body },
          data,
          android: { priority: 'high', notification: { sound: 'default' } },
          apns: { payload: { aps: { sound: 'default', badge: 1 } } },
        });
      } catch (e) {
        this.logger.warn('FCM multicast failed', e);
      }
    }
  }
}
