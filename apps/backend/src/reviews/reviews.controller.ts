import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { JwtAuthGuard } from '../common/jwt-auth.guard';

@Controller('reviews')
@UseGuards(JwtAuthGuard)
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get('latest')
  latest(@Query('propertyId') propertyId: string) {
    return this.reviewsService.latest(propertyId);
  }
}
