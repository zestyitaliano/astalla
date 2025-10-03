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

  async validate(rawCredential: Record<string, unknown>) {
    try {
      const accessToken = this.getString(rawCredential.accessToken, "accessToken");
      const propertyId = this.getString(rawCredential.propertyId ?? rawCredential.ga4PropertyId, "propertyId");
      const today = new Date();
      const start = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      const date = `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, "0")}-${String(
        start.getUTCDate()
      ).padStart(2, "0")}`;

      await this.runReport({
        accessToken,
        propertyId,
        body: {
          dimensions: [{ name: "date" }],
          metrics: [{ name: "totalUsers" }],
          dateRanges: [{ startDate: date, endDate: date }],
          limit: 1
        }
      });

      return { ok: true } as const;
    } catch (error) {
      const message = (error as Error).message ?? "Unable to validate GA4 credential";
      this.logger.warn(`GA4 validation failed: ${message}`);
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
