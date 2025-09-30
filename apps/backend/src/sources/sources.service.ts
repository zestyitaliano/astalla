import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SourcesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(propertyId?: string) {
    const sources = await this.prisma.sourceAccount.findMany({
      where: propertyId ? { propertyId } : undefined,
      orderBy: { createdAt: 'desc' },
    });

    return sources.map((source) => ({
      id: source.id,
      propertyId: source.propertyId,
      type: source.type,
      createdAt: source.createdAt,
      updatedAt: source.updatedAt,
      credentialStatus: source.credential ? 'configured' : 'missing',
    }));
  }
}
