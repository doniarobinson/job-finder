/** True when running on Vercel (production, preview, or `vercel dev`). */
export function isVercelDeployment(): boolean {
  return process.env.VERCEL === "1";
}

/** True when running on Vercel production (scheduled cron enabled). */
export function isProductionDeployment(): boolean {
  return process.env.VERCEL_ENV === "production";
}
