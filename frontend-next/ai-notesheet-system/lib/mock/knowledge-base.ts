import type { KnowledgeDocument } from "@/lib/types"

export const knowledgeDocuments: KnowledgeDocument[] = [
  { id: "kb-01", title: "General Financial Rules, 2017 (Consolidated)", type: "GFR Rule", indexedAt: "2026-01-05", sizeKb: 4820, tags: ["procurement", "purchase committee", "GeM"], citedCount: 61 },
  { id: "kb-02", title: "Delegation of Financial Power Rules — Schedule V", type: "DFPR Rule", indexedAt: "2026-01-05", sizeKb: 980, tags: ["delegation", "capital equipment"], citedCount: 28 },
  { id: "kb-03", title: "GGSIPU Statute 14 — Student Welfare Fund", type: "University Statute", indexedAt: "2026-01-08", sizeKb: 340, tags: ["student welfare", "fund"], citedCount: 12 },
  { id: "kb-04", title: "Registrar's Circular 7/2019 — Guest Faculty Honorarium Ceilings", type: "Circular", indexedAt: "2026-01-08", sizeKb: 64, tags: ["honorarium", "guest faculty"], citedCount: 33 },
  { id: "kb-05", title: "Student Council Bye-laws — Club Budget Provisions", type: "University Statute", indexedAt: "2026-01-10", sizeKb: 212, tags: ["club budget", "student council"], citedCount: 15 },
  { id: "kb-06", title: "University TA/DA Rules, Revised Edition", type: "University Statute", indexedAt: "2026-01-10", sizeKb: 560, tags: ["travel", "TA/DA"], citedCount: 24 },
  { id: "kb-07", title: "Finance Office Circular — GST Treatment on Purchases", type: "Circular", indexedAt: "2026-01-12", sizeKb: 48, tags: ["GST", "tax"], citedCount: 19 },
  { id: "kb-08", title: "Student Welfare Guidelines — Event Expenditure", type: "Circular", indexedAt: "2026-01-14", sizeKb: 128, tags: ["events", "fest", "expenditure"], citedCount: 17 },
  { id: "kb-09", title: "Sanction: 3-axis CNC Trainer Kit, Mechanical Engineering", type: "Precedent Note Sheet", indexedAt: "2026-02-01", sizeKb: 18, tags: ["lab equipment", "precedent"], citedCount: 14 },
  { id: "kb-10", title: "Sanction: Digital Storage Oscilloscopes, Electronics Lab", type: "Precedent Note Sheet", indexedAt: "2026-02-01", sizeKb: 16, tags: ["lab equipment", "precedent"], citedCount: 9 },
  { id: "kb-11", title: "Sanction: Guest Honorarium, Industry 4.0 Workshop", type: "Precedent Note Sheet", indexedAt: "2026-02-03", sizeKb: 12, tags: ["honorarium", "precedent"], citedCount: 11 },
  { id: "kb-12", title: "Sanction: Techfest Vortex 2024 Budget", type: "Precedent Note Sheet", indexedAt: "2026-02-05", sizeKb: 22, tags: ["events", "precedent"], citedCount: 6 },
  { id: "kb-13", title: "Sanction: TA/DA National Robotics Championship", type: "Precedent Note Sheet", indexedAt: "2026-02-06", sizeKb: 15, tags: ["travel", "precedent"], citedCount: 8 },
  { id: "kb-14", title: "Sanction: Robotics Club Annual Budget 2024–25", type: "Precedent Note Sheet", indexedAt: "2026-02-06", sizeKb: 13, tags: ["club budget", "precedent"], citedCount: 5 },
]

export const retrievalStats = {
  totalDocuments: knowledgeDocuments.length,
  totalChunksIndexed: 2184,
  lastReindexedAt: "2026-08-19T02:00:00+05:30",
  mostCitedDocuments: [...knowledgeDocuments].sort((a, b) => b.citedCount - a.citedCount).slice(0, 6),
}
