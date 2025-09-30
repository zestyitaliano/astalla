import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OrgsService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.org.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        properties: {
          select: {
            id: true,
            name: true,
            propertyCode: true,
            region: true,
          },
        },
      },
    });
  }
}
