import { NextResponse } from "next/server";

import { inngest } from "@/inngest/client";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await inngest.send({ name: "job-finder/cycle.run", data: { source: "vercel-cron" } });

  return NextResponse.json({ ok: true, triggered: true });
}
