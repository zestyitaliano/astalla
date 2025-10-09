import "reflect-metadata";

import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { HttpAdapterHost, NestFactory } from "@nestjs/core";
import { json } from "express";

import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  app.use(json({ limit: "10mb" }));

  const rawOrigins =
    configService.get<string>("cors.origin") ?? process.env.CORS_ORIGIN ?? "";
  const configuredOrigins = rawOrigins
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);

  const origins = configuredOrigins.length > 0 ? configuredOrigins : ["http://localhost:3000"];

  app.enableCors({
    origin: origins,
    credentials: true,
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    allowedHeaders: "Content-Type,Authorization"
  });

  const { httpAdapter } = app.get(HttpAdapterHost);
  if (typeof httpAdapter.get === "function") {
    httpAdapter.get("/healthz", (_req, res) => {
      res.status(200).json({ ok: true });
    });
  }

  const port = configService.get<number>("app.port", 3001);
  await app.listen(port);
  Logger.log(`Backend listening on port ${port}`, "Bootstrap");
  Logger.log(`CORS origins: ${origins.join(", ")}`, "Bootstrap");
}

void bootstrap();
