import { Controller, Get } from '@nestjs/common';

@Controller('admin')
export class AdminController {
  @Get('sources')
  listSources() {
    return [
      {
        id: 'src-entrata-1',
        propertyId: 'prop-1',
        type: 'ENTRATA',
        credential: { key: '***redacted***' },
        status: 'connected'
      },
      {
        id: 'src-google-ads-1',
        propertyId: 'prop-1',
        type: 'GOOGLE_ADS',
        credential: { developerToken: '***redacted***' },
        status: 'connected'
      }
    ];
  }
}
