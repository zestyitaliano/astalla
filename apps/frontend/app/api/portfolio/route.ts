import { NextResponse } from "next/server";

import {
  createPortfolioRecord,
  listPortfolioRecords,
  type PortfolioRecord
} from "@/lib/portfolio-store";

export async function GET() {
  const rows = listPortfolioRecords();
  return NextResponse.json({ rows });
}

export async function POST(request: Request) {
  let payload: Partial<PortfolioRecord> | undefined;
  try {
    payload = await request.json();
  } catch (error) {
    console.warn("Failed to parse portfolio payload", error);
  }
  const record = createPortfolioRecord(payload);
  return NextResponse.json(record, { status: 201 });
}
