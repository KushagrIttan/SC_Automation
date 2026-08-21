import type { AnalyticsSnapshot } from "@/lib/types"

export const analyticsSnapshot: AnalyticsSnapshot = {
  requestsByCategory: [
    { category: "Lab Equipment Purchase", count: 47 },
    { category: "Event/Fest Expenditure", count: 19 },
    { category: "Guest Faculty Honorarium", count: 38 },
    { category: "Student Travel/TA-DA", count: 29 },
    { category: "Club Budget", count: 16 },
  ],
  turnaroundByCategory: [
    { category: "Lab Equipment Purchase", days: 6.4 },
    { category: "Event/Fest Expenditure", days: 4.1 },
    { category: "Guest Faculty Honorarium", days: 2.8 },
    { category: "Student Travel/TA-DA", days: 3.6 },
    { category: "Club Budget", days: 5.2 },
  ],
  approvalOutcome: [
    { name: "Approved", value: 118 },
    { name: "Rejected", value: 14 },
    { name: "Pending", value: 17 },
  ],
  mostCitedRules: [
    { code: "GFR Rule 153", count: 61 },
    { code: "Honorarium Circular 7/2019", count: 33 },
    { code: "DFPR Schedule V, Item 12", count: 28 },
    { code: "University TA/DA Rules", count: 24 },
    { code: "Event Expenditure Guideline 9", count: 17 },
  ],
  mostCitedPrecedents: [
    { title: "CNC Trainer Kit — Mechanical Engineering", count: 14 },
    { title: "Industry 4.0 Honorarium Series", count: 11 },
    { title: "DSO Purchase — Electronics Lab", count: 9 },
    { title: "National Robotics Championship TA/DA", count: 8 },
    { title: "3D Printers — Design Innovation Lab", count: 7 },
  ],
  totalRequests: 149,
  avgTurnaroundDays: 4.4,
  approvalRate: 0.89,
}
