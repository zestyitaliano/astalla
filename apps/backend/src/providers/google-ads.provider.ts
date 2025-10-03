import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios from "axios";

interface GoogleAdsQueryOptions {
  accessToken: string;
  customerId: string;
  loginCustomerId?: string;
  developerToken?: string;
  query: string;
}

@Injectable()
export class GoogleAdsProvider {
  private readonly logger = new Logger(GoogleAdsProvider.name);
  private readonly defaultDeveloperToken?: string;

  constructor(private readonly configService: ConfigService) {
    this.defaultDeveloperToken = this.configService.get<string>("GOOGLE_ADS_DEVELOPER_TOKEN") ?? undefined;
  }

  async runQuery<T = unknown>(options: GoogleAdsQueryOptions): Promise<T[]> {
    const developerToken = options.developerToken ?? this.defaultDeveloperToken;
    if (!developerToken) {
      throw new Error("Google Ads developer token is not configured");
    }

    const url = `https://googleads.googleapis.com/v18/customers/${options.customerId}/googleAds:searchStream`;
    const response = await axios.post(url, { query: options.query }, {
      headers: {
        Authorization: `Bearer ${options.accessToken}`,
        "Content-Type": "application/json",
        "developer-token": developerToken,
        ...(options.loginCustomerId ? { "login-customer-id": options.loginCustomerId } : {})
      },
      timeout: 30000
    });

    const body = response.data;
    const rows: T[] = [];
    if (Array.isArray(body)) {
      for (const chunk of body) {
        if (Array.isArray(chunk?.results)) {
          rows.push(...(chunk.results as T[]));
        }
      }
    }

    this.logger.debug(`Google Ads query returned ${rows.length} rows for customer ${options.customerId}`);
    return rows;
  }

  async validate(rawCredential: Record<string, unknown>) {
    try {
      const accessToken = this.getString(rawCredential.accessToken, "accessToken");
      const customerId = this.getString(rawCredential.customerId ?? rawCredential.loginCustomerId, "customerId");
      const developerToken = typeof rawCredential.developerToken === "string" ? rawCredential.developerToken : undefined;
      const loginCustomerId = typeof rawCredential.loginCustomerId === "string" ? rawCredential.loginCustomerId : undefined;

      await this.runQuery({
        accessToken,
        customerId,
        developerToken,
        loginCustomerId,
        query: "SELECT customer.id FROM customer LIMIT 1"
      });

      return { ok: true } as const;
    } catch (error) {
      const message = (error as Error).message ?? "Unable to validate Google Ads credential";
      this.logger.warn(`Google Ads validation failed: ${message}`);
      return { ok: false, message } as const;
    }
  }

  private getString(value: unknown, field: string) {
    if (typeof value !== "string" || value.trim().length === 0) {
      throw new Error(`Missing credential field ${field}`);
    }
    return value.trim();
  }
}
