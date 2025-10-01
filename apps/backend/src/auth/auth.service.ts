import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { User } from "@prisma/client";
import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

import { MockIntegrationsService } from "../providers/mock-integrations.service";
import { PrismaService } from "../prisma/prisma.service";
import { BasicLoginDto } from "./dto/basic-login.dto";
import { RegisterDto } from "./dto/register.dto";

@Injectable()
export class AuthService {
  private readonly hasDatabase: boolean;

  constructor(
    private readonly integrations: MockIntegrationsService,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService
  ) {
    this.hasDatabase = Boolean(this.configService.get<string>("database.url"));
  }

  getCurrentUser() {
    return this.integrations.getCurrentUser();
  }

  async register(dto: RegisterDto) {
    if (!this.hasDatabase) {
      throw new ServiceUnavailableException("User registration requires a configured database");
    }

    const email = dto.email.trim().toLowerCase();
    const username = dto.username ? dto.username.trim().toLowerCase() : null;
    const name = dto.name?.trim();
    const orgName = dto.orgName?.trim();

    const existingByEmail = await this.prisma.user.findUnique({ where: { email } });
    if (existingByEmail) {
      throw new BadRequestException("A user with that email already exists");
    }

    if (username) {
      const existingByUsername = await this.prisma.user.findUnique({ where: { username } });
      if (existingByUsername) {
        throw new BadRequestException("That username is already taken");
      }
    }

    const passwordHash = this.hashPassword(dto.password);

    const org = await this.prisma.org.create({
      data: {
        name: orgName || this.deriveOrgName(name, email)
      }
    });

    const user = await this.prisma.user.create({
      data: {
        email,
        name: name || null,
        username,
        passwordHash,
        orgId: org.id
      }
    });

    return this.mapToAccount(user as UserWithCredentials);
  }

  async basicLogin(dto: BasicLoginDto) {
    const identifier = dto.identifier.trim().toLowerCase();
    const password = dto.password;

    const envAccount = this.validateEnvironmentAccount(identifier, password);
    if (envAccount) {
      return envAccount;
    }

    if (!this.hasDatabase) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier },
          { username: identifier }
        ]
      }
    });

    if (!user) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const userWithCredentials = user as UserWithCredentials;

    const isPasswordValid = this.verifyPassword(password, userWithCredentials.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException("Invalid credentials");
    }

    return this.mapToAccount(userWithCredentials);
  }

  private mapToAccount(user: UserWithCredentials) {
    return {
      id: user.id,
      email: user.email,
      name: user.name ?? undefined,
      username: user.username ?? undefined,
      orgId: user.orgId
    };
  }

  private hashPassword(password: string) {
    const salt = randomBytes(16).toString("hex");
    const hash = scryptSync(password, salt, 64).toString("hex");
    return `${salt}:${hash}`;
  }

  private verifyPassword(password: string, storedHash: string) {
    const [salt, hash] = storedHash.split(":");
    if (!salt || !hash) {
      return false;
    }

    const storedBuffer = Buffer.from(hash, "hex");
    const derived = scryptSync(password, salt, storedBuffer.length);
    return timingSafeEqual(storedBuffer, derived);
  }

  private deriveOrgName(name: string | undefined, email: string) {
    if (name) {
      return `${name}'s Portfolio`;
    }

    const [localPart] = email.split("@");
    return `${localPart}'s Portfolio`;
  }

  private validateEnvironmentAccount(identifier: string, password: string) {
    const envEmail = process.env.BASIC_AUTH_EMAIL?.toLowerCase();
    const envUsername = process.env.BASIC_AUTH_USERNAME?.toLowerCase();
    const envPassword = process.env.BASIC_AUTH_PASSWORD ?? "password";
    const envName = process.env.BASIC_AUTH_NAME;

    const matchesEmail = envEmail && identifier === envEmail;
    const matchesUsername = envUsername && identifier === envUsername;

    if (!matchesEmail && !matchesUsername) {
      return null;
    }

    if (password !== envPassword) {
      throw new UnauthorizedException("Invalid credentials");
    }

    return {
      id: matchesUsername && envUsername ? envUsername : matchesEmail && envEmail ? envEmail : "env-user",
      email: envEmail || (matchesUsername && envUsername ? `${envUsername}@example.com` : identifier),
      name: envName || undefined,
      username: envUsername || undefined,
      orgId: undefined
    };
  }
}
type UserWithCredentials = User & {
  username: string | null;
  passwordHash: string;
};
