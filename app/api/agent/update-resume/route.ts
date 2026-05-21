import { NextResponse } from "next/server";

import { adminAuthFailure } from "@/lib/api/adminAuth";
import { db } from "@/lib/db";
import { updateProfileResume } from "@/lib/profile";

export async function POST(request: Request) {
  const denied = adminAuthFailure(request);
  if (denied) return denied;

  if (!db) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  let body: { resumeText?: string; resetSearchParams?: boolean };
  try {
    body = (await request.json()) as { resumeText?: string; resetSearchParams?: boolean };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.resumeText?.trim()) {
    return NextResponse.json({ error: "resumeText is required" }, { status: 400 });
  }

  try {
    const result = await updateProfileResume(body.resumeText, {
      resetSearchParams: body.resetSearchParams,
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Resume update failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
