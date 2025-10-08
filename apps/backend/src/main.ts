import "reflect-metadata";

import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { json } from "express";

import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  app.use(json({ limit: "10mb" }));

  const configuredOrigins = normalizeOrigins(configService.get<string>("frontend.origin"));
  const originEntries = configuredOrigins.length > 0
    ? configuredOrigins
    : getDefaultOrigins(process.env.NODE_ENV);

  const originMatchers = originEntries.map(toOriginMatcher);

  app.enableCors({
    credentials: true,
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      const isAllowed = originMatchers.some((matcher) =>
        typeof matcher === "string" ? matcher === origin : matcher.test(origin)
      );

      if (isAllowed) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origin ${origin} not allowed by CORS`), false);
    }
  });

  const port = configService.get<number>("app.port", 3001);
  await app.listen(port);
  Logger.log(`Backend listening on port ${port}`, "Bootstrap");
}

void bootstrap();

function normalizeOrigins(value: string | undefined | null): string[] {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function getDefaultOrigins(nodeEnv: string | undefined): string[] {
  const defaults = new Set<string>();
  defaults.add("https://app.astalla.com");
  defaults.add("https://*.vercel.app");

  if (!nodeEnv || nodeEnv === "development" || nodeEnv === "test") {
    defaults.add("http://localhost:3000");
  }

  return Array.from(defaults);
}

function toOriginMatcher(origin: string): string | RegExp {
  if (!origin.includes("*")) {
    return origin;
  }

  const escaped = origin.replace(/[-/\\^$+?.()|[\]{}]/g, "\\$&");
  const pattern = `^${escaped.replace(/\\\*/g, ".*")}$`;
  return new RegExp(pattern);
}
