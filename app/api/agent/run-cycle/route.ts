import { NextResponse } from "next/server";

import { runSearchCycle } from "@/lib/agent/runSearchCycle";
import { adminAuthFailure } from "@/lib/api/adminAuth";

export async function POST(request: Request) {
  const denied = adminAuthFailure(request);
  if (denied) return denied;

  try {
    const result = await runSearchCycle();
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Cycle failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
