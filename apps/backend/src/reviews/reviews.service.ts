import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async latest(propertyId: string) {
    const reviews = await this.prisma.review.findMany({
      where: { propertyId },
      orderBy: { at: 'desc' },
      take: 10,
    });

    const avg = reviews.length === 0 ? 0 : reviews.reduce((acc, review) => acc + review.rating, 0) / reviews.length;
    return {
      averageRating: Number(avg.toFixed(2)),
      reviewCount: reviews.length,
      positiveShare: reviews.length === 0 ? 0 : reviews.filter((r) => r.rating >= 4).length / reviews.length,
      reviews,
    };
  }
}
