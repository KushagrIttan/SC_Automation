import { approverDirectory } from "@/lib/mock/approvers"
import type { Approver } from "@/lib/types"

function delay(ms = 300) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function fetchApproverDirectory(): Promise<Approver[]> {
  await delay()
  return JSON.parse(JSON.stringify(approverDirectory))
}
