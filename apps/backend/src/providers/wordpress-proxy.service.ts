import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios from "axios";
import { createHmac } from "crypto";

interface WordPressPromoPayload {
  property_code: string;
  promo_text: string;
  hero_image_url?: string;
  sig: string;
}

interface WordPressPromoOptions {
  endpoint: string;
  propertyCode: string;
  promoText: string;
  heroImageUrl?: string;
  sharedSecret?: string;
}

@Injectable()
export class WordPressProxyService {
  private readonly logger = new Logger(WordPressProxyService.name);
  private readonly sharedSecret: string;

  constructor(private readonly configService: ConfigService) {
    this.sharedSecret = this.configService.get<string>("WP_PROXY_SHARED_SECRET") ?? "";
  }

  async sendPromo(options: WordPressPromoOptions) {
    const secret = options.sharedSecret ?? this.sharedSecret;
    if (!secret) {
      throw new Error("WordPress proxy shared secret is not configured");
    }

    const payload: WordPressPromoPayload = {
      property_code: options.propertyCode,
      promo_text: options.promoText,
      hero_image_url: options.heroImageUrl,
      sig: this.sign({
        property_code: options.propertyCode,
        promo_text: options.promoText,
        hero_image_url: options.heroImageUrl
      }, secret)
    };

    await axios.post(options.endpoint, payload, {
      headers: {
        "Content-Type": "application/json"
      },
      timeout: 15000
    });

    this.logger.debug(`WordPress promo delivered for property ${options.propertyCode}`);
  }

  private sign(payload: Omit<WordPressPromoPayload, "sig">, secret: string) {
    const hmac = createHmac("sha256", secret);
    hmac.update(JSON.stringify(payload));
    return hmac.digest("hex");
  }
}
