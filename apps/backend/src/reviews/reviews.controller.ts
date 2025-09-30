import { Controller, Get } from "@nestjs/common";

import { ReviewsService } from "./reviews.service";

@Controller("reviews")
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get("latest")
  getLatest() {
    return this.reviewsService.getLatest();
  }
}
