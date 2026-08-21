import type { Approver } from "@/lib/types"

// Master directory of possible approvers. Individual note sheets reference
// a subset of these by id and layer their own status/signature on top.
export const approverDirectory: Approver[] = [
  {
    id: "apr-01",
    name: "Dr. Nalin Kapoor",
    position: "Head of Department, Robotics & Automation",
    department: "Robotics & Automation",
    status: "Pending",
    recommended: true,
  },
  {
    id: "apr-02",
    name: "Prof. Sunita Rawal",
    position: "Head of Department, Electronics & Communication",
    department: "Electronics & Communication",
    status: "Pending",
    recommended: true,
  },
  {
    id: "apr-03",
    name: "Mr. Deepak Chauhan",
    position: "Section Officer, Purchase Cell",
    department: "Purchase & Stores",
    status: "Pending",
    recommended: true,
  },
  {
    id: "apr-04",
    name: "Ms. Ritika Sehgal",
    position: "Assistant Registrar, Accounts",
    department: "Accounts",
    status: "Pending",
    recommended: true,
  },
  {
    id: "apr-05",
    name: "Dr. Farhan Iqbal",
    position: "Comptroller of Finance",
    department: "Finance",
    status: "Pending",
    recommended: true,
  },
  {
    id: "apr-06",
    name: "Prof. Meenal Trivedi",
    position: "Dean, Student Welfare",
    department: "Student Welfare",
    status: "Pending",
    recommended: false,
  },
  {
    id: "apr-07",
    name: "Dr. Aloke Bannerjee",
    position: "Registrar",
    department: "Registrar's Office",
    status: "Pending",
    recommended: true,
  },
  {
    id: "apr-08",
    name: "Prof. (Dr.) Vandana Suri",
    position: "Dean of Academic Affairs",
    department: "Dean's Office",
    status: "Pending",
    recommended: true,
  },
  {
    id: "apr-09",
    name: "Mr. Kunal Bhasin",
    position: "Estate Officer",
    department: "Estate & Infrastructure",
    status: "Pending",
    recommended: false,
  },
  {
    id: "apr-10",
    name: "Prof. Harpreet Anand",
    position: "Vice Chancellor",
    department: "Vice Chancellor's Office",
    status: "Pending",
    recommended: true,
  },
]

export function getApprover(id: string): Approver {
  const found = approverDirectory.find((a) => a.id === id)
  if (!found) throw new Error(`Unknown approver id: ${id}`)
  return { ...found }
}
