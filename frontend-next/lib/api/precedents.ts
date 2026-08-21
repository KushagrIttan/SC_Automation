import { precedentLibrary, getPrecedent } from "@/lib/mock/precedents"
import type { Precedent } from "@/lib/types"

function delay(ms = 350) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function fetchPrecedents(): Promise<Precedent[]> {
  await delay()
  return JSON.parse(JSON.stringify(precedentLibrary))
}

export async function fetchPrecedent(id: string): Promise<Precedent | null> {
  await delay(200)
  const found = getPrecedent(id)
  return found ? JSON.parse(JSON.stringify(found)) : null
}

export async function fetchPrecedentsByIds(ids: string[]): Promise<Precedent[]> {
  await delay(200)
  return precedentLibrary.filter((p) => ids.includes(p.id)).map((p) => JSON.parse(JSON.stringify(p)))
}
