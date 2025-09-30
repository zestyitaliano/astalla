import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Queue } from "bullmq";
import IORedis from "ioredis";

@Injectable()
export class JobsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(JobsService.name);
  private connection?: IORedis;
  private etlQueue?: Queue;
  private alertsQueue?: Queue;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const redisUrl = this.configService.get<string>("redis.url");

    if (!redisUrl) {
      this.logger.warn("REDIS_URL not configured. Background jobs are disabled.");
      return;
    }

    this.connection = new IORedis(redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false
    });

    this.etlQueue = new Queue("etl-jobs", {
      connection: this.connection
    });
    this.alertsQueue = new Queue("alert-jobs", {
      connection: this.connection
    });

    this.logger.log("BullMQ queues initialized");
  }

  async onModuleDestroy() {
    await this.etlQueue?.close();
    await this.alertsQueue?.close();
    await this.connection?.quit();
  }

  async enqueueSnapshot() {
    if (!this.etlQueue) {
      this.logger.warn("Attempted to enqueue snapshot without a configured queue");
      return;
    }

    await this.etlQueue.add("weeklySnapshot", {}, { removeOnComplete: true });
  }

  async enqueueAlerts() {
    if (!this.alertsQueue) {
      this.logger.warn("Attempted to enqueue alerts without a configured queue");
      return;
    }

    await this.alertsQueue.add("dispatchAlerts", {}, { removeOnComplete: true });
  }
}
