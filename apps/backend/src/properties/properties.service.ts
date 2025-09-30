import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PropertiesService {
  constructor(private readonly prisma: PrismaService) {}

  list(orgId?: string) {
    return this.prisma.property.findMany({
      where: orgId ? { orgId } : undefined,
      orderBy: { name: 'asc' },
      select: {
        id: true,
        propertyCode: true,
        name: true,
        region: true,
        unitCount: true,
      },
    });
  }

  get(propertyId: string) {
    return this.prisma.property.findUnique({
      where: { id: propertyId },
      include: {
        reviews: {
          orderBy: { at: 'desc' },
          take: 10,
        },
        sentiments: {
          orderBy: { weekStart: 'desc' },
          take: 1,
        },
      },
    });
  }
}
