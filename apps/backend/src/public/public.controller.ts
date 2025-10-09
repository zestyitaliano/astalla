import { BadRequestException, Controller, Get, NotFoundException, Query } from "@nestjs/common";

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
    const sanitizedHost = (host ?? "").toLowerCase().split("/")[0]?.split("?")[0]?.split(":")[0]?.trim();

    if (!sanitizedHost) {
      throw new BadRequestException("host is required");
    }

    const segments = sanitizedHost.split(".").filter(Boolean);
    const isLocalhost = segments[segments.length - 1] === "localhost";
    if (segments.length < 2 || (!isLocalhost && segments.length < 3)) {
      throw new BadRequestException("host must include a subdomain");
    }

    const subdomain = segments[0];

    const publicDashboard = await this.prisma.publicDashboard.findUnique({
      where: { subdomain }
    });

    if (!publicDashboard || !publicDashboard.isActive) {
      throw new NotFoundException("dashboard not found");
    }

    const config = (publicDashboard.config as PublicDashboardConfig) ?? {};
    const widgets = Array.isArray(config.widgets) ? config.widgets : [];

    return {
      title: publicDashboard.title,
      config,
      widgets,
      propertyId: publicDashboard.propertyId ?? null,
      updatedAt: publicDashboard.updatedAt.toISOString()
    };
  }
}
