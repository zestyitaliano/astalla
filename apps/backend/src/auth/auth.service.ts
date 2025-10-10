import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { User, UserRole } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import { sign, verify } from "jsonwebtoken";

import { PrismaService } from "../prisma/prisma.service";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  username?: string;
  role: UserRole;
  createdAt: Date;
}

export interface JwtClaims {
  sub: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly allowSelfSignup: boolean;
  private readonly adminDevBypass: boolean;
  private readonly adminDevEmail: string | null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService
  ) {
    this.allowSelfSignup = this.configService.get<boolean>("auth.allowSelfSignup") ?? false;
    this.adminDevBypass = this.configService.get<boolean>("auth.adminDevBypass") ?? false;
    this.adminDevEmail = this.configService.get<string>("auth.adminDevEmail")?.toLowerCase() ?? null;
  }

  async validateUser(emailOrUsername: string, password: string): Promise<User> {
    const identifier = emailOrUsername.trim().toLowerCase();

    if (!identifier) {
      throw new UnauthorizedException("Invalid credentials");
    }

    if (this.adminDevBypass && this.adminDevEmail && identifier === this.adminDevEmail) {
      const adminUser = await this.prisma.user.findUnique({ where: { email: identifier } });
      if (!adminUser) {
        throw new UnauthorizedException("Invalid credentials");
      }

      this.logger.warn(
        `ADMIN_DEV_BYPASS is enabled for ${identifier}. Password verification has been skipped.`
      );

      if (adminUser.role !== UserRole.ORG_ADMIN) {
        const elevatedUser = await this.prisma.user.update({
          where: { id: adminUser.id },
          data: { role: UserRole.ORG_ADMIN }
        });

        this.logger.warn(`User ${identifier} role elevated to ORG_ADMIN due to bypass.`);
        return elevatedUser;
      }

      return adminUser;
    }

    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier },
          { username: identifier }
        ]
      }
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException("Invalid credentials");
    }

    return user;
  }

  async login(dto: LoginDto) {
    const rawIdentifier = typeof dto.identifier === "string" ? dto.identifier : "";
    const identifier = rawIdentifier.trim().toLowerCase();

    if (!identifier) {
      this.logger.warn("AuthService: login missing identifier");
      throw new BadRequestException("identifier is required");
    }

    this.logger.log(`AuthService: login attempt for ${identifier}`);

    try {
      const user = await this.validateUser(identifier, dto.password);
      const authUser = this.toAuthUser(user);
      const token = this.signJwt({ sub: user.id, email: user.email, role: user.role });

      this.logger.log(`AuthService: login success for ${authUser.email}`);

      return { user: authUser, token };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        this.logger.warn(`AuthService: login failed for ${identifier}`);
      } else if (error instanceof Error) {
        this.logger.error(`AuthService: unexpected error for ${identifier}: ${error.message}`);
      } else {
        this.logger.error(`AuthService: unexpected throwable for ${identifier}`);
      }

      throw error;
    }
  }

  async register(dto: RegisterDto) {
    if (!this.allowSelfSignup) {
      throw new ForbiddenException("Self sign-up is disabled");
    }

    const email = dto.email.trim().toLowerCase();
    const username = dto.username ? dto.username.trim().toLowerCase() : null;
    const name = dto.name.trim();
    const role = dto.role ?? UserRole.ORG_ADMIN;

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

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        email,
        username,
        name,
        passwordHash,
        role
      }
    });

    const authUser = this.toAuthUser(user);
    const token = this.signJwt({ sub: user.id, email: user.email, role: user.role });

    return { user: authUser, token };
  }

  signJwt(payload: Omit<JwtClaims, "iat" | "exp">): string {
    const secret = this.getJwtSecret();

    return sign(payload, secret, {
      algorithm: "HS256",
      expiresIn: "7d"
    });
  }

  verifyToken(token: string): JwtClaims {
    const secret = this.getJwtSecret();

    try {
      return verify(token, secret, { algorithms: ["HS256"] }) as JwtClaims;
    } catch (error) {
      this.logger.warn(
        `Failed to verify JWT: ${error instanceof Error ? error.message : "unknown error"}`
      );
      throw new UnauthorizedException("Invalid token");
    }
  }

  async getUserFromClaims(claims: JwtClaims): Promise<AuthUser | null> {
    const user = await this.prisma.user.findUnique({ where: { id: claims.sub } });

    if (!user) {
      return null;
    }

    return this.toAuthUser(user);
  }

  private toAuthUser(user: User): AuthUser {
    return {
      id: user.id,
      email: user.email,
      name: user.name ?? undefined,
      username: user.username ?? undefined,
      role: user.role,
      createdAt: user.createdAt
    };
  }

  private getJwtSecret(): string {
    const secret = this.configService.get<string>("auth.jwtSecret") ?? process.env.JWT_SECRET;

    if (!secret) {
      throw new InternalServerErrorException("JWT_SECRET is not configured");
    }

    return secret;
  }
}
