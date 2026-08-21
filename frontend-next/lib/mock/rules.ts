import type { RuleCitation } from "@/lib/types"

// Rule/citation corpus. Sourced (fictionally, for demo purposes) from GFR 2017,
// DFPR, and university statutes — this mirrors what a RAG pipeline over the
// real rule documents would return.
export const ruleLibrary: RuleCitation[] = [
  {
    id: "rule-gfr-153",
    code: "GFR Rule 153",
    title: "Purchase of goods by a Purchase Committee",
    excerpt:
      "Purchases of goods up to the value of ₹2,50,000 (Rupees Two Lakh Fifty Thousand) only on each occasion may be made on the recommendations of a duly constituted Local Purchase Committee consisting of three members of an appropriate level as decided by the Head of the Department. The committee will survey the market to ascertain the reasonableness of rate, quality and specifications and identify the appropriate supplier.",
    sourceDoc: "General Financial Rules, 2017",
  },
  {
    id: "rule-gfr-155",
    code: "GFR Rule 155",
    title: "Purchase through Government e-Marketplace (GeM)",
    excerpt:
      "Goods required on regular basis in bulk shall be procured in a rate contract or through open tender. Procuring authorities may procure goods and services available on GeM, directly by using the search, compare, select and buy functionality.",
    sourceDoc: "General Financial Rules, 2017",
  },
  {
    id: "rule-gfr-159",
    code: "GFR Rule 159",
    title: "Purchase without quotation",
    excerpt:
      "Purchase of goods up to the value of ₹50,000 (Rupees Fifty Thousand) only on each occasion may be made without inviting quotations or bids on the basis of a certificate to be recorded by the competent authority that the price is reasonable.",
    sourceDoc: "General Financial Rules, 2017",
  },
  {
    id: "rule-dfpr-12",
    code: "DFPR Schedule V, Item 12",
    title: "Delegated financial powers for capital equipment",
    excerpt:
      "The Head of Department may sanction expenditure on scientific and laboratory equipment up to ₹1,00,000 per item, subject to budget provision; sanctions beyond this ceiling require concurrence of the Finance Committee.",
    sourceDoc: "Delegation of Financial Power Rules",
  },
  {
    id: "rule-tada-4",
    code: "TA/DA Rule 4.2",
    title: "Entitlement for outstation academic travel",
    excerpt:
      "Faculty and students travelling on approved academic business are entitled to reimbursement of travel by the shortest route, at the class of entitlement specified in Schedule III, along with daily allowance at prescribed rates for the actual number of days on duty.",
    sourceDoc: "University TA/DA Rules",
  },
  {
    id: "rule-honorarium-7",
    code: "Honorarium Circular 7/2019",
    title: "Ceiling on guest faculty honorarium",
    excerpt:
      "Honorarium payable to guest/visiting faculty for a lecture or session shall not exceed ₹3,000 per session (₹1,500 for a resource person below the rank of Associate Professor), subject to a maximum of ₹15,000 per day, inclusive of applicable TDS.",
    sourceDoc: "Registrar's Office Circular",
  },
  {
    id: "rule-event-9",
    code: "Event Expenditure Guideline 9",
    title: "Ceiling on fest and cultural event expenditure",
    excerpt:
      "Expenditure on student fests and cultural events shall be sanctioned against a detailed budget approved by the Dean, Student Welfare, and shall not exceed the amount allocated in the annual Student Activity Fund for the concerned academic year.",
    sourceDoc: "Student Welfare Guidelines",
  },
  {
    id: "rule-club-3",
    code: "Club Budget Rule 3.1",
    title: "Annual ceiling for registered student clubs",
    excerpt:
      "Each registered student club is entitled to a maximum annual budget of ₹75,000, disbursed in tranches against submitted activity proposals and utilisation certificates for the preceding tranche.",
    sourceDoc: "Student Council Bye-laws",
  },
  {
    id: "rule-gst-2",
    code: "Finance Circular GST-2",
    title: "GST treatment on equipment purchases",
    excerpt:
      "All purchase proposals must reflect applicable GST separately in the budget estimate; input tax credit, where available to the University, should be netted off before computing the final sanctioned amount.",
    sourceDoc: "Finance Office Circular",
  },
]

export function getRule(id: string): RuleCitation {
  const found = ruleLibrary.find((r) => r.id === id)
  if (!found) throw new Error(`Unknown rule id: ${id}`)
  return found
}
