import "reflect-metadata";

import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { json } from "express";

import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: true });
  const configService = app.get(ConfigService);

  app.use(json({ limit: "10mb" }));

  const frontendOrigin = configService.get<string>("frontend.origin");
  if (frontendOrigin) {
    app.enableCors({
      origin: frontendOrigin.split(",").map((origin) => origin.trim()),
      credentials: true
    });
  }

  const port = configService.get<number>("app.port", 3001);
  await app.listen(port);
  Logger.log(`Backend listening on port ${port}`, "Bootstrap");
}

void bootstrap();
