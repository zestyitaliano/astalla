import { Controller, Get, Query } from "@nestjs/common";

import { ReviewsService } from "./reviews.service";

@Controller("reviews")
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get("latest")
  getLatest(@Query("propertyId") propertyId?: string) {
    return this.reviewsService.getLatest(propertyId);
  }
}
