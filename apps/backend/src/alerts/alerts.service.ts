import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AlertsService {
  constructor(private readonly prisma: PrismaService) {}

  list(propertyId?: string) {
    return this.prisma.alert.findMany({
      where: propertyId ? { propertyId } : undefined,
      orderBy: { at: 'desc' },
      take: 20,
    });
  }
}
