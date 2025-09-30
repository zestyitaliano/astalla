import { Injectable } from "@nestjs/common";

import { MockIntegrationsService } from "../providers/mock-integrations.service";

@Injectable()
export class ReviewsService {
  constructor(private readonly integrations: MockIntegrationsService) {}

  getLatest() {
    return this.integrations.getLatestReviews();
  }
}
