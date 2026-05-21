"use server";

import { revalidatePath } from "next/cache";

import { runSearchCycle } from "@/lib/agent/runSearchCycle";
import type { AgentCycleResult } from "@/lib/types";

export async function triggerAgentCycle(): Promise<AgentCycleResult> {
  const result = await runSearchCycle();
  revalidatePath("/");
  return result;
}
