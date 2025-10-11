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

  const allowedOrigins = ["https://app.astalla.com", "http://localhost:3000"];

  app.enableCors({
    origin: allowedOrigins,
    credentials: true
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
  Logger.log(`CORS origins: ${allowedOrigins.join(", ")}`, "Bootstrap");
}

void bootstrap();
