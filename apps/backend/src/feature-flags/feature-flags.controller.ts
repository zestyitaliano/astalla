import { Body, Controller, Get, Param, Put, Query } from "@nestjs/common";
import { FeatureFlagState, updateFeatureFlagRequestSchema } from "@shared/api";
import { z } from "zod";

import { FeatureFlagsService } from "./feature-flags.service";

const updateRequestSchema = updateFeatureFlagRequestSchema.extend({
  workspaceId: z.string().nullable().optional(),
  userId: z.string().nullable().optional(),
});

@Controller("feature-flags")
export class FeatureFlagsController {
  constructor(private readonly featureFlagsService: FeatureFlagsService) {}

  @Get(":flag")
  getFlag(
    @Param("flag") flag: string,
    @Query("workspaceId") workspaceId?: string,
    @Query("userId") userId?: string,
  ): Promise<FeatureFlagState> {
    const resolvedWorkspace = this.resolveWorkspaceId(workspaceId);
    const resolvedUser = this.resolveUserId(userId);
    return this.featureFlagsService.getState({
      flag,
      workspaceId: resolvedWorkspace,
      userId: resolvedUser,
    });
  }

  @Put(":flag")
  async updateFlag(
    @Param("flag") flag: string,
    @Body() body: unknown,
    @Query("workspaceId") workspaceId?: string,
    @Query("userId") userId?: string,
  ): Promise<FeatureFlagState> {
    const parsed = updateRequestSchema.parse(body);
    const resolvedWorkspace = this.resolveWorkspaceId(parsed.workspaceId ?? workspaceId);
    const resolvedUser = this.resolveUserId(parsed.userId ?? userId);

    return this.featureFlagsService.setFlag({
      flag,
      scope: parsed.scope,
      enabled: parsed.enabled,
      workspaceId: resolvedWorkspace,
      userId: parsed.scope === "workspace" ? null : resolvedUser,
    });
  }

  private resolveWorkspaceId(candidate?: string | null): string {
    if (candidate && candidate.trim()) {
      return candidate;
    }
    return "demo-org";
  }

  private resolveUserId(candidate?: string | null): string {
    if (candidate && candidate.trim()) {
      return candidate;
    }
    return "demo-user";
  }
}
