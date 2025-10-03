import { Injectable, Logger } from "@nestjs/common";
import axios from "axios";

interface GoogleBusinessReviewOptions {
  accessToken: string;
  accountId: string;
  locationId: string;
  pageToken?: string;
}

interface GoogleBusinessReview {
  name: string;
  starRating?: string;
  comment?: string;
  createTime?: string;
  updateTime?: string;
  reviewer?: {
    displayName?: string;
    profilePhotoUrl?: string;
    isAnonymous?: boolean;
  };
  reviewReply?: {
    comment?: string;
    updateTime?: string;
  };
}

@Injectable()
export class GoogleBusinessProvider {
  private readonly logger = new Logger(GoogleBusinessProvider.name);

  async listReviews(options: GoogleBusinessReviewOptions) {
    const url = new URL(
      `https://mybusiness.googleapis.com/v4/accounts/${encodeURIComponent(options.accountId)}/locations/${encodeURIComponent(options.locationId)}/reviews`
    );
    url.searchParams.set("pageSize", "50");
    if (options.pageToken) {
      url.searchParams.set("pageToken", options.pageToken);
    }

    const response = await axios.get(url.toString(), {
      headers: {
        Authorization: `Bearer ${options.accessToken}`,
        "Content-Type": "application/json"
      },
      timeout: 30000
    });

    const reviews = Array.isArray(response.data?.reviews)
      ? (response.data.reviews as GoogleBusinessReview[])
      : [];

    this.logger.debug(
      `GBP listReviews returned ${reviews.length} reviews for location ${options.locationId}`
    );

    return {
      reviews,
      averageRating: response.data?.averageRating ?? null,
      totalReviewCount: response.data?.totalReviewCount ?? null,
      nextPageToken: response.data?.nextPageToken as string | undefined
    };
  }

  async validate(rawCredential: Record<string, unknown>) {
    try {
      const accessToken = this.getString(rawCredential.accessToken, "accessToken");
      const accountId = this.getString(rawCredential.accountId, "accountId");
      const locationId = this.getString(rawCredential.locationId, "locationId");

      await this.listReviews({ accessToken, accountId, locationId, pageToken: undefined });
      return { ok: true } as const;
    } catch (error) {
      const message = (error as Error).message ?? "Unable to validate GBP credential";
      this.logger.warn(`Google Business validation failed: ${message}`);
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

export type { GoogleBusinessReview, GoogleBusinessReviewOptions };
