import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";

import { PrismaService } from "../prisma/prisma.service";
import { CreatePublicDashboardDto } from "./dto/create-public-dashboard.dto";
import { UpdatePublicDashboardDto } from "./dto/update-public-dashboard.dto";

@Injectable()
export class PublicDashboardsService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    const dashboards = await this.prisma.publicDashboard.findMany({
      orderBy: { createdAt: "desc" }
    });

    return { dashboards };
  }

  async create(payload: CreatePublicDashboardDto) {
    const subdomain = this.normalizeSubdomain(payload.subdomain);
    const data: Prisma.PublicDashboardCreateInput = {
      title: payload.title.trim(),
      subdomain,
      orgId: payload.orgId,
      propertyId: payload.propertyId ?? null,
      config: payload.config ?? { widgets: [] },
      isActive: payload.isActive ?? true
    };

    try {
      return await this.prisma.publicDashboard.create({ data });
    } catch (error) {
      this.handlePrismaError(error, subdomain);
    }
  }

  async update(id: string, payload: UpdatePublicDashboardDto) {
    const data: Prisma.PublicDashboardUpdateInput = {};

    if (payload.title !== undefined) {
      data.title = payload.title.trim();
    }
    if (payload.subdomain !== undefined) {
      data.subdomain = this.normalizeSubdomain(payload.subdomain);
    }
    if (payload.orgId !== undefined) {
      data.orgId = payload.orgId;
    }
    if (payload.propertyId !== undefined) {
      data.propertyId = payload.propertyId || null;
    }
    if (payload.config !== undefined) {
      data.config = payload.config;
    }
    if (payload.isActive !== undefined) {
      data.isActive = payload.isActive;
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException("No updates provided");
    }

    try {
      return await this.prisma.publicDashboard.update({ where: { id }, data });
    } catch (error) {
      this.handlePrismaError(error, payload.subdomain);
    }
  }

  async remove(id: string) {
    try {
      await this.prisma.publicDashboard.delete({ where: { id } });
      return { success: true };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        throw new NotFoundException("Dashboard not found");
      }
      throw error;
    }
  }

  private normalizeSubdomain(value: string) {
    const slug = value
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-{2,}/g, "-")
      .replace(/^-+|-+$/g, "");

    if (!slug) {
      throw new BadRequestException("Subdomain is required");
    }

    return slug;
  }

  private handlePrismaError(error: unknown, subdomain?: string): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        throw new BadRequestException(
          `Subdomain ${subdomain ?? ""} is already in use. Choose a different value.`
        );
      }
      if (error.code === "P2025") {
        throw new NotFoundException("Dashboard not found");
      }
    }

    throw error;
  }
}
