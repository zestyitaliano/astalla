import { Injectable } from '@nestjs/common';
import { DataService } from '../../common/data.service';

@Injectable()
export class ReportsService {
  constructor(private readonly dataService: DataService) {}

  latest(propertyId: string) {
    return this.dataService.getReport(propertyId ?? 'prop-1');
  }

  create(propertyId: string) {
    const existing = this.dataService.getReport(propertyId);
    return existing ?? this.latest('prop-1');
  }
}
