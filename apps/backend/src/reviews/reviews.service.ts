import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { LatestReviewsResponse } from "@shared/api";

import { PrismaService } from "../prisma/prisma.service";
import { MockIntegrationsService } from "../providers/mock-integrations.service";

@Injectable()
export class ReviewsService {
  private readonly logger = new Logger(ReviewsService.name);
  private readonly hasDatabase: boolean;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly integrations: MockIntegrationsService
  ) {
    this.hasDatabase = Boolean(this.configService.get<string>("database.url"));
  }

  async getLatest(propertyId?: string, useMock = false): Promise<LatestReviewsResponse> {
    if (!propertyId) {
      throw new BadRequestException("propertyId is required to fetch reviews");
    }

    if (useMock || !this.hasDatabase) {
      return this.integrations.getLatestReviews(propertyId);
    }

    try {
      const [aggregate, respondedCount, recent, sentiment] = await Promise.all([
        this.prisma.review.aggregate({
          where: { propertyId },
          _avg: { rating: true },
          _count: { _all: true }
        }),
        this.prisma.review.count({ where: { propertyId, respondedAt: { not: null } } }),
        this.prisma.review.findMany({
          where: { propertyId },
          orderBy: { at: "desc" },
          take: 12
        }),
        this.prisma.sentimentSummary.findFirst({
          where: { propertyId },
          orderBy: { weekStart: "desc" }
        })
      ]);

      const totalReviews = aggregate._count._all ?? 0;
      const averageRating = aggregate._avg.rating ?? 0;
      const responseRate = totalReviews > 0 ? respondedCount / totalReviews : 0;

      const recentFormatted = recent.map((review) => ({
        id: review.id,
        author: review.authorName ?? "Resident",
        rating: review.rating,
        body: review.text,
        submittedAt: review.at.toISOString()
      }));

      return {
        summary: {
          averageRating: Number(averageRating.toFixed(2)),
          reviewCount: totalReviews,
          responseRate: Number(responseRate.toFixed(3)),
          sentiment: sentiment
            ? {
                positive: sentiment.posPct,
                negative: sentiment.negPct,
                topics: sentiment.topics
              }
            : undefined
        },
        recent: recentFormatted
      };
    } catch (error) {
      this.logger.warn(`Falling back to mock reviews: ${(error as Error).message}`);
      return this.integrations.getLatestReviews(propertyId);
    }
  }
}
