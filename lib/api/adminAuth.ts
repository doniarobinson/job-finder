import { NextResponse } from "next/server";

/** Returns a 401 response when ADMIN_SECRET is set and the request header does not match. */
export function adminAuthFailure(request: Request): NextResponse | null {
  const adminSecret = process.env.ADMIN_SECRET;
  if (!adminSecret) return null;

  const header = request.headers.get("x-admin-secret");
  if (header !== adminSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}
