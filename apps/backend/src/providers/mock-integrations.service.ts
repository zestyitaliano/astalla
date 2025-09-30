import { Injectable } from '@nestjs/common';
import dayjs from 'dayjs';

@Injectable()
export class MockIntegrationsService {
  getEntrataLeads(propertyCode: string) {
    return Array.from({ length: 5 }).map((_, idx) => ({
      externalId: `${propertyCode}-LEAD-${idx}`,
      status: idx % 2 === 0 ? 'ACTIVE' : 'PENDING',
      updated_at: dayjs().subtract(idx, 'day').toISOString(),
    }));
  }

  getGoogleAdsCost(propertyCode: string) {
    return {
      propertyCode,
      campaigns: [
        { id: `${propertyCode}-CAMP-1`, cost: 230.5 },
        { id: `${propertyCode}-CAMP-2`, cost: 180.25 },
      ],
      refreshedAt: new Date().toISOString(),
    };
  }

  getGa4Conversions(propertyCode: string) {
    return {
      propertyCode,
      conversions: [
        { event: 'lead', count: 24 },
        { event: 'application_submitted', count: 6 },
      ],
    };
  }

  getGbpReviews(propertyCode: string) {
    return Array.from({ length: 3 }).map((_, idx) => ({
      author: `Resident ${idx + 1}`,
      rating: 5 - idx,
      text: `Great stay at ${propertyCode}!`,
      at: dayjs().subtract(idx, 'day').toISOString(),
    }));
  }
}
