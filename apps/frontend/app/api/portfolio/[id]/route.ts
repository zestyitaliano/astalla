import { NextResponse } from "next/server";

import {
  deletePortfolioRecord,
  listPortfolioRecords,
  updatePortfolioRecord,
  type PortfolioRecord
} from "@/lib/portfolio-store";

interface RouteParams {
  params: {
    id: string;
  };
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const id = params.id;
  let payload: Partial<PortfolioRecord> | undefined;

  try {
    payload = await request.json();
  } catch (error) {
    console.warn("Failed to parse portfolio patch", error);
  }

  const updated = updatePortfolioRecord(id, payload ?? {});
  if (!updated) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }
  return NextResponse.json(updated);
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  deletePortfolioRecord(params.id);
  return NextResponse.json({ ok: true });
}

export async function GET(_request: Request, { params }: RouteParams) {
  const record = listPortfolioRecords().find((entry) => entry.id === params.id);
  if (!record) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }
  return NextResponse.json(record);
}
