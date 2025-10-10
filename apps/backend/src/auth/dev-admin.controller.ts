import { Controller, ForbiddenException, Logger, Post } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import * as bcrypt from "bcryptjs";

import { PrismaService } from "../prisma/prisma.service";

const ADMIN_EMAIL = "admin@astalla.com";
const ADMIN_PASSWORD = "Astalla2025!";
const ADMIN_NAME = "Astalla Admin";

@Controller("admin/dev")
export class DevAdminController {
  private readonly logger = new Logger(DevAdminController.name);

  constructor(private readonly prisma: PrismaService) {}

  @Post("seed-admin")
  async seedAdmin() {
    if (process.env.ALLOW_DEV_SEED !== "true") {
      throw new ForbiddenException("Dev seed is disabled");
    }

    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);

    const user = await this.prisma.user.upsert({
      where: { email: ADMIN_EMAIL },
      update: {
        name: ADMIN_NAME,
        passwordHash,
        role: UserRole.ORG_ADMIN
      },
      create: {
        email: ADMIN_EMAIL,
        name: ADMIN_NAME,
        passwordHash,
        role: UserRole.ORG_ADMIN
      }
    });

    this.logger.log("seed-admin ensured admin user");

    return {
      ok: true,
      userId: user.id
    };
  }
}
