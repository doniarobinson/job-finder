"use server";

import { revalidatePath } from "next/cache";

import { runSearchCycle } from "@/lib/agent/runSearchCycle";
import { rebootstrapProfileFromEnv } from "@/lib/profile";
import type { AgentCycleResult, UpdateResumeResult } from "@/lib/types";

export async function triggerAgentCycle(): Promise<AgentCycleResult> {
  const result = await runSearchCycle();
  revalidatePath("/");
  return result;
}

export async function triggerAgentRebootstrap(): Promise<UpdateResumeResult> {
  const result = await rebootstrapProfileFromEnv();
  revalidatePath("/");
  return result;
}
