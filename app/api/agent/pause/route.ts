import { NextResponse } from "next/server";

import { db, schema } from "@/lib/db";

export async function POST(request: Request) {
  const adminSecret = process.env.ADMIN_SECRET;
  if (adminSecret) {
    const header = request.headers.get("x-admin-secret");
    if (header !== adminSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  if (!db) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const body = (await request.json()) as { paused?: boolean };
  const paused = Boolean(body.paused);

  await db
    .insert(schema.agentSettings)
    .values({ id: 1, paused, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: schema.agentSettings.id,
      set: { paused, updatedAt: new Date() },
    });

  return NextResponse.json({ paused });
}
