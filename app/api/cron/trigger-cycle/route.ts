import { NextResponse } from "next/server";

import { inngest } from "@/inngest/client";
import { isProductionDeployment } from "@/lib/runtimeEnv";

export async function GET(request: Request) {
  if (!isProductionDeployment()) {
    return NextResponse.json(
      { error: "Scheduler is disabled outside production" },
      { status: 403 },
    );
  }

  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await inngest.send({ name: "job-finder/cycle.run", data: { source: "vercel-cron" } });

  return NextResponse.json({ ok: true, triggered: true });
}
