import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { DevicePushToken } from './entities/device-push-token.entity';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../../common/enums';
import type { NotificationAudience } from '../admin/entities/notification.entity';

type PushPayload = {
  title: string;
  body: string;
  data?: Record<string, string>;
};

/**
 * Stores Expo push tokens and delivers OS notifications to each user's devices only.
 */
@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);

  constructor(
    @InjectRepository(DevicePushToken)
    private readonly tokens: Repository<DevicePushToken>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
  ) {}

  async upsertToken(userId: string, token: string, platform?: string) {
    const trimmed = token.trim();
    if (!trimmed || trimmed.length < 20) {
      return { ok: false as const, reason: 'invalid_token' };
    }
    const existing = await this.tokens.findOne({ where: { token: trimmed } });
    if (existing) {
      existing.userId = userId;
      existing.platform = (platform ?? existing.platform ?? 'unknown').slice(0, 20);
      await this.tokens.save(existing);
      return { ok: true as const };
    }
    await this.tokens.save(
      this.tokens.create({
        userId,
        token: trimmed,
        platform: (platform ?? 'unknown').slice(0, 20),
      }),
    );
    return { ok: true as const };
  }

  async clearToken(userId: string, token?: string) {
    if (token?.trim()) {
      await this.tokens.delete({ userId, token: token.trim() });
    } else {
      await this.tokens.delete({ userId });
    }
    return { ok: true as const };
  }

  /** Resolve recipient user IDs for an in-app notification audience. */
  async resolveAudienceUserIds(
    audience: NotificationAudience,
    userId?: string | null,
  ): Promise<string[]> {
    if (audience === 'USER') {
      return userId ? [userId] : [];
    }
    if (audience === 'CUSTOMERS') {
      const rows = await this.users.find({
        where: { role: UserRole.CUSTOMER },
        select: ['id'],
      });
      return rows.map((u) => u.id);
    }
    if (audience === 'PROVIDERS') {
      const rows = await this.users.find({
        where: { role: In([UserRole.PROVIDER, UserRole.ADMIN]) },
        select: ['id'],
      });
      return rows.map((u) => u.id);
    }
    // ALL
    const rows = await this.users.find({ select: ['id'] });
    return rows.map((u) => u.id);
  }

  async sendToUsers(userIds: string[], payload: PushPayload) {
    const unique = [...new Set(userIds.filter(Boolean))];
    if (!unique.length) return { sent: 0 };

    const rows = await this.tokens.find({
      where: { userId: In(unique) },
    });
    if (!rows.length) {
      this.logger.debug(`No push tokens for ${unique.length} user(s)`);
      return { sent: 0 };
    }

    return this.dispatch(
      rows.map((r) => r.token),
      payload,
    );
  }

  async sendToUser(userId: string, payload: PushPayload) {
    return this.sendToUsers([userId], payload);
  }

  /**
   * Push for a saved AppNotification — only to users in that audience.
   */
  async notifyForAppNotification(notice: {
    id: string;
    title: string;
    message: string;
    audience: NotificationAudience;
    userId?: string | null;
    kind?: string;
  }) {
    const userIds = await this.resolveAudienceUserIds(
      notice.audience,
      notice.userId,
    );
    return this.sendToUsers(userIds, {
      title: notice.title,
      body: notice.message,
      data: {
        notificationId: notice.id,
        kind: notice.kind ?? 'GENERAL',
        type: 'app_notification',
      },
    });
  }

  private async dispatch(tokens: string[], payload: PushPayload) {
    const messages = tokens.map((to) => ({
      to,
      sound: 'default' as const,
      title: payload.title,
      body: payload.body,
      data: payload.data ?? {},
      channelId: 'default',
      priority: 'high' as const,
    }));

    let sent = 0;
    // Expo accepts batches of up to 100
    for (let i = 0; i < messages.length; i += 100) {
      const chunk = messages.slice(i, i + 100);
      try {
        const res = await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Accept-Encoding': 'gzip, deflate',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(chunk),
        });
        const json = (await res.json()) as {
          data?: Array<{ status?: string; details?: { error?: string } }>;
        };
        const results = Array.isArray(json?.data) ? json.data : [];
        for (let j = 0; j < results.length; j++) {
          const r = results[j];
          if (r?.status === 'ok') {
            sent += 1;
            continue;
          }
          const err = r?.details?.error;
          if (err === 'DeviceNotRegistered' || err === 'InvalidCredentials') {
            const bad = chunk[j]?.to;
            if (bad) {
              await this.tokens.delete({ token: bad });
              this.logger.warn(`Removed invalid push token (${err})`);
            }
          } else if (err) {
            this.logger.warn(`Push failed: ${err}`);
          }
        }
      } catch (e) {
        this.logger.error(
          `Expo push request failed: ${e instanceof Error ? e.message : e}`,
        );
      }
    }
    return { sent };
  }
}
