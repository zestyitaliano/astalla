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
}

export type { GoogleBusinessReview, GoogleBusinessReviewOptions };
