import { NextResponse } from "next/server";

import { runSearchCycle } from "@/lib/agent/runSearchCycle";

export async function POST(request: Request) {
  const adminSecret = process.env.ADMIN_SECRET;
  if (adminSecret) {
    const header = request.headers.get("x-admin-secret");
    if (header !== adminSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const result = await runSearchCycle();
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Cycle failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
