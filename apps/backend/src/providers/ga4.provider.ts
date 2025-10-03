import { Injectable, Logger } from "@nestjs/common";
import axios from "axios";

interface Ga4ReportOptions {
  accessToken: string;
  propertyId: string;
  body: Record<string, unknown>;
}

@Injectable()
export class Ga4Provider {
  private readonly logger = new Logger(Ga4Provider.name);

  async runReport<T = unknown>(options: Ga4ReportOptions): Promise<T[]> {
    const url = `https://analyticsdata.googleapis.com/v1beta/properties/${options.propertyId}:runReport`;
    const response = await axios.post(url, options.body, {
      headers: {
        Authorization: `Bearer ${options.accessToken}`,
        "Content-Type": "application/json"
      },
      timeout: 30000
    });

    const rows: T[] = [];
    if (Array.isArray(response.data?.rows)) {
      rows.push(...(response.data.rows as T[]));
    }

    this.logger.debug(`GA4 runReport returned ${rows.length} rows for property ${options.propertyId}`);
    return rows;
  }
}
