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
}
