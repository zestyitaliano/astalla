import { BadRequestException, Injectable } from "@nestjs/common";
import { FeatureFlagScope, FeatureFlagState } from "@shared/api";

import { PrismaService } from "../prisma/prisma.service";

interface ResolveStateParams {
  flag: string;
  workspaceId?: string | null;
  userId?: string | null;
}

interface SetFlagParams extends ResolveStateParams {
  scope: FeatureFlagScope;
  enabled: boolean;
}

@Injectable()
export class FeatureFlagsService {
  constructor(private readonly prisma: PrismaService) {}

  async getState(params: ResolveStateParams): Promise<FeatureFlagState> {
    const { flag, workspaceId = null, userId = null } = params;

    const [workspaceRecord, userRecord] = await Promise.all([
      workspaceId
        ? this.prisma.featureFlag.findFirst({
            where: { flag, workspaceId, userId: null },
          })
        : null,
      userId
        ? this.prisma.featureFlag.findFirst({
            where: { flag, workspaceId, userId },
          })
        : null,
    ]);

    const workspaceEnabled = workspaceId ? Boolean(workspaceRecord?.enabled) : null;
    const userEnabled = userId ? Boolean(userRecord?.enabled) : null;

    const effectiveEnabled = (workspaceEnabled ?? true) && (userEnabled ?? true);

    return {
      flag,
      workspaceId,
      workspaceEnabled,
      userId,
      userEnabled,
      effectiveEnabled,
    };
  }

  async setFlag(params: SetFlagParams): Promise<FeatureFlagState> {
    const { flag, scope, enabled } = params;
    const workspaceId = params.workspaceId ?? null;
    const userId = params.userId ?? null;

    if (scope === "workspace") {
      if (!workspaceId) {
        throw new BadRequestException("workspaceId is required for workspace scope");
      }
      await this.upsertRecord({ flag, workspaceId, userId: null, enabled });
    } else {
      if (!workspaceId) {
        throw new BadRequestException("workspaceId is required for user scope");
      }
      if (!userId) {
        throw new BadRequestException("userId is required for user scope");
      }
      await this.upsertRecord({ flag, workspaceId, userId, enabled });
    }

    return this.getState({ flag, workspaceId, userId });
  }

  private async upsertRecord(params: {
    flag: string;
    workspaceId: string | null;
    userId: string | null;
    enabled: boolean;
  }): Promise<void> {
    const { flag, workspaceId, userId, enabled } = params;

    const existing = await this.prisma.featureFlag.findFirst({
      where: { flag, workspaceId, userId },
    });

    if (existing) {
      await this.prisma.featureFlag.update({
        where: { id: existing.id },
        data: { enabled },
      });
      return;
    }

    await this.prisma.featureFlag.create({
      data: { flag, workspaceId, userId, enabled },
    });
  }
}
