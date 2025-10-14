import "reflect-metadata";
import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { HttpAdapterHost, NestFactory } from "@nestjs/core";
import { json } from "express";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Allow large JSON payloads
  app.use(json({ limit: "10mb" }));

  // CORS configuration for frontend + local dev
  const allowedOrigins = [
    "https://app.astalla.com",
    "http://localhost:3000",
    /^https:\/\/astalla-[^.]+\.vercel\.app$/,
  ];

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  // Simple /health endpoint for Render’s internal check
  const { httpAdapter } = app.get(HttpAdapterHost);
  if (typeof httpAdapter.get === "function") {
    httpAdapter.get("/health", (_req, res) => {
      res.status(200).json({ status: "ok" });
    });
    httpAdapter.get("/healthz", (_req, res) => {
      res.status(200).json({ ok: true });
    });
  }

  // 👇 Important: use Render’s injected PORT and listen on 0.0.0.0
  const port = process.env.PORT || configService.get<number>("app.port", 3001);

  await app.listen(port, "0.0.0.0");
  Logger.log(`🚀 Backend listening on 0.0.0.0:${port}`, "Bootstrap");
  Logger.log(`CORS origins: ${allowedOrigins.join(", ")}`, "Bootstrap");
}

void bootstrap();
