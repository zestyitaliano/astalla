import { Controller, Get } from '@nestjs/common';
import { OrgsService } from './orgs.service';

@Controller('orgs')
export class OrgsController {
  constructor(private readonly orgsService: OrgsService) {}

  @Get()
  list() {
    return this.orgsService.list();
  }
}
