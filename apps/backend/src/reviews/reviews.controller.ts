import { Controller, Get, Headers, Query } from "@nestjs/common";

import { ReviewsService } from "./reviews.service";

@Controller("reviews")
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get("latest")
  getLatest(@Query("propertyId") propertyId?: string, @Headers("x-mock-mode") mockHeader?: string) {
    return this.reviewsService.getLatest(propertyId, this.shouldUseMock(mockHeader));
  }

  private shouldUseMock(header?: string) {
    return header?.toLowerCase() === "true";
  }
}
