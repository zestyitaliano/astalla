import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer
} from "@nestjs/websockets";
import { Logger } from "@nestjs/common";
import type { Server, Socket } from "socket.io";

import { TableCollaborationService } from "./table-collaboration.service";

@WebSocketGateway({ namespace: "table-collab", cors: { origin: "*" } })
export class TableCollaborationGateway implements OnGatewayConnection {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(TableCollaborationGateway.name);

  constructor(private readonly collab: TableCollaborationService) {}

  async handleConnection(client: Socket) {
    this.logger.debug(`Client connected: ${client.id}`);
  }

  @SubscribeMessage("join")
  async handleJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: {
      tableId: string;
    }
  ) {
    if (!payload?.tableId) {
      client.emit("error", { message: "tableId is required" });
      return;
    }

    client.join(payload.tableId);
    const state = await this.collab.encodeState(payload.tableId);
    client.emit("sync", { update: Buffer.from(state).toString("base64") });
  }

  @SubscribeMessage("update")
  async handleUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: {
      tableId: string;
      update: string;
      actorId?: string | null;
    }
  ) {
    if (!payload?.tableId || !payload.update) {
      client.emit("error", { message: "tableId and update are required" });
      return;
    }

    const binary = Buffer.from(payload.update, "base64");
    await this.collab.applyUpdate(payload.tableId, new Uint8Array(binary));
    client.to(payload.tableId).emit("update", payload);
  }
}
