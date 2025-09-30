import { Injectable, NotFoundException } from '@nestjs/common';
import { DataService } from '../../common/data.service';

@Injectable()
export class PropertiesService {
  constructor(private readonly dataService: DataService) {}

  list() {
    return this.dataService.listProperties();
  }

  detail(id: string) {
    const property = this.dataService.getProperty(id);
    if (!property) {
      throw new NotFoundException('Property not found');
    }
    return property;
  }
}
