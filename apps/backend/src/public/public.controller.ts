import { Controller, Get, Query } from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";

type DashboardWidget = {
  id?: string;
  label?: string;
  value?: unknown;
};

type PublicDashboardConfig = {
  widgets?: DashboardWidget[];
  [key: string]: unknown;
};

@Controller("public")
export class PublicController {
  constructor(private readonly prisma: PrismaService) {}

  @Get("resolve")
  async resolve(@Query("host") host: string) {
    const sanitizedHost = (host ?? "").toLowerCase().split(":")[0];
    const parts = sanitizedHost.split(".");
    const subdomain = parts.length > 2 ? parts[0] : null;

    if (!subdomain) {
      return { error: "no subdomain" };
    }

    const publicDashboard = await this.prisma.publicDashboard.findUnique({
      where: { subdomain }
    });

    if (!publicDashboard || !publicDashboard.isActive) {
      return { error: "not found" };
    }

    const config = (publicDashboard.config as PublicDashboardConfig) ?? {};
    const widgets = Array.isArray(config.widgets) ? config.widgets : [];

    return {
      title: publicDashboard.title,
      config,
      widgets
    };
  }
}
