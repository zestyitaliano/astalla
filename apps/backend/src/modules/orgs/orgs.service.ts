import { Injectable } from '@nestjs/common';
import { DataService } from '../../common/data.service';

@Injectable()
export class OrgsService {
  constructor(private readonly dataService: DataService) {}

  list() {
    return this.dataService.getOrgScope();
  }
}
