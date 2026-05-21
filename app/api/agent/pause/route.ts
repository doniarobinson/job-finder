import { NextResponse } from "next/server";

import { adminAuthFailure } from "@/lib/api/adminAuth";
import { db, schema } from "@/lib/db";

export async function POST(request: Request) {
  const denied = adminAuthFailure(request);
  if (denied) return denied;

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
