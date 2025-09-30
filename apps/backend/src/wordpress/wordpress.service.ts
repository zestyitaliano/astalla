import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import crypto from 'crypto';
import axios from 'axios';

@Injectable()
export class WordPressService {
  constructor(private readonly config: ConfigService) {}

  async pushPromo(endpoint: string, payload: { property_code: string; promo_text: string; hero_image_url?: string }) {
    const secret = this.config.get<string>('WP_PROXY_SHARED_SECRET');
    const body = {
      property_code: payload.property_code,
      promo_text: payload.promo_text,
      hero_image_url: payload.hero_image_url,
      sig: this.signPayload(payload, secret),
    };

    if (this.config.get('MOCK_MODE') === 'true') {
      return { status: 'mocked', body };
    }

    await axios.post(endpoint, body, {
      headers: { 'Content-Type': 'application/json' },
    });
    return { status: 'sent' };
  }

  private signPayload(payload: Record<string, unknown>, secret: string | undefined) {
    if (!secret) {
      return '';
    }
    const encoded = JSON.stringify(payload);
    return crypto.createHmac('sha256', secret).update(encoded).digest('hex');
  }
}
