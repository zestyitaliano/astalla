import { Controller, Get } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../prisma/prisma.service";

const ADMIN_EMAIL = "admin@astalla.com";

@Controller("health")
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService
  ) {}

  @Get("auth")
  async getAuthHealth() {
    const report: {
      db: "ok" | "error";
      seedAdminExists: boolean;
      bcryptModule: "bcryptjs" | "bcrypt";
      env: {
        hasJwtSecret: boolean;
        hasEncryptionKey: boolean;
      };
    } = {
      db: "ok",
      seedAdminExists: false,
      bcryptModule: "bcryptjs",
      env: {
        hasJwtSecret:
          Boolean(this.configService.get<string>("auth.jwtSecret")) || Boolean(process.env.JWT_SECRET),
        hasEncryptionKey: Boolean(process.env.ENCRYPTION_KEY)
      }
    };

    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch (error) {
      report.db = "error";
    }

    try {
      const user = await this.prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });
      report.seedAdminExists = Boolean(user);
    } catch (error) {
      report.db = "error";
    }

    return report;
  }
}
