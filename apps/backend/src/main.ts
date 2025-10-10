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

  const defaultOrigins: (string | RegExp)[] = [
    "https://app.astalla.com",
    /\.vercel\.app$/,
    "http://localhost:3000"
  ];

  app.enableCors({
    origin: defaultOrigins,
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-mock-mode"]
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
  Logger.log(
    `CORS origins: ${defaultOrigins
      .map((origin) => (origin instanceof RegExp ? origin.toString() : origin))
      .join(", ")}`,
    "Bootstrap"
  );
}

void bootstrap();
