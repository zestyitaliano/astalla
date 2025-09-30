import { Injectable } from '@nestjs/common';
import { DataService } from '../../common/data.service';

@Injectable()
export class ReviewsService {
  constructor(private readonly dataService: DataService) {}

  latest(propertyId: string) {
    return this.dataService.getReviews(propertyId);
  }
}
