import { Module } from "@nestjs/common";

import { ReviewsController } from "./reviews.controller";
import { ReviewsService } from "./reviews.service";
import { ProvidersModule } from "../providers/providers.module";

@Module({
  imports: [ProvidersModule],
  controllers: [ReviewsController],
  providers: [ReviewsService]
})
export class ReviewsModule {}
