import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AppRole } from '../common/roles';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: { property: true },
        },
      },
    });

    if (!user) {
      return null;
    }

    const primaryRole = user.roles[0];
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: (primaryRole?.role ?? AppRole.PROPERTY) as AppRole,
      orgId: primaryRole?.orgId ?? null,
      propertyScopes: user.roles
        .filter((role) => role.propertyId)
        .map((role) => ({ id: role.propertyId!, propertyCode: role.property?.propertyCode ?? '' })),
    };
  }
}
