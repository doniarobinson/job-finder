/** True when running on Vercel (production, preview, or `vercel dev`). */
export function isVercelDeployment(): boolean {
  return process.env.VERCEL === "1";
}
