import { NextResponse } from "next/server";

import { reorderPortfolioRecords } from "@/lib/portfolio-store";

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch (error) {
    console.warn("Failed to parse portfolio reorder payload", error);
  }

  if (
    !payload ||
    typeof payload !== "object" ||
    !("order" in payload) ||
    !Array.isArray((payload as { order: unknown }).order)
  ) {
    return NextResponse.json({ message: "Invalid order payload" }, { status: 400 });
  }

  const orderUpdates = (payload as { order: Array<{ id: string; order: number }> }).order.filter(
    (entry): entry is { id: string; order: number } =>
      typeof entry?.id === "string" && typeof entry?.order === "number"
  );

  const rows = reorderPortfolioRecords(orderUpdates);
  return NextResponse.json({ rows });
}
