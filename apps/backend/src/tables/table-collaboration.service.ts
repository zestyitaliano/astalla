import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import * as Y from "yjs";

import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class TableCollaborationService {
  private readonly logger = new Logger(TableCollaborationService.name);

  constructor(private readonly prisma: PrismaService) {}

  async loadDocument(tableId: string) {
    const tableExists = await this.prisma.table.findUnique({ where: { id: tableId }, select: { id: true } });
    if (!tableExists) {
      throw new NotFoundException("Table not found");
    }

    const snapshot = await this.prisma.tableCrdtSnapshot.findUnique({ where: { tableId } });
    const doc = new Y.Doc();

    if (snapshot?.state) {
      try {
        Y.applyUpdate(doc, new Uint8Array(snapshot.state));
      } catch (error) {
        this.logger.warn(`Failed to hydrate CRDT snapshot for table ${tableId}: ${error}`);
      }
    }

    return doc;
  }

  async encodeState(tableId: string) {
    const doc = await this.loadDocument(tableId);
    return Y.encodeStateAsUpdate(doc);
  }

  async applyUpdate(tableId: string, update: Uint8Array) {
    const doc = await this.loadDocument(tableId);
    Y.applyUpdate(doc, update);
    await this.persistDocument(tableId, doc);
    return update;
  }

  private async persistDocument(tableId: string, doc: Y.Doc) {
    const encoded = Y.encodeStateAsUpdate(doc);
    await this.prisma.tableCrdtSnapshot.upsert({
      where: { tableId },
      create: {
        tableId,
        state: Buffer.from(encoded)
      },
      update: {
        state: Buffer.from(encoded)
      }
    });
  }
}
