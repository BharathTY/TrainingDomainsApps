import { PracticePage as PracticeSheet, type PracticeRow } from "@/shared/PracticePage"

const rows: PracticeRow[] = [
  { feature: "Login / RBAC", screen: "login", level: 1, exercise: "Sign in as each of the 12 ERP roles and confirm the sidebar modules change." },
  { feature: "Dashboard KPIs", screen: "dashboard", level: 1, exercise: "Read finance, HR, and operations KPIs for Finance Manager vs Employee." },
  { feature: "Employees", screen: "employees", level: 2, exercise: "Search an employee number and open the directory list." },
  { feature: "Leave request", screen: "leaves", level: 2, exercise: "As employee, submit leave; as deptmgr, approve via Approvals." },
  { feature: "Journals", screen: "journals", level: 3, exercise: "Create a balanced journal as accountant; post as finmgr (SoD blocks self-post)." },
  { feature: "Journal reversal", screen: "journals", level: 3, exercise: "Reverse a posted journal and confirm a new reversing entry appears." },
  { feature: "Procure to Pay", screen: "workflows", level: 3, exercise: "Receive PO goods and confirm inventory ledger movement." },
  { feature: "Order to Cash", screen: "workflows", level: 3, exercise: "Fulfill a sales order and open the customer invoice list." },
  { feature: "Expense reimbursement", screen: "workflows", level: 2, exercise: "Reimburse an approved expense claim and check the audit log." },
  { feature: "Reports", screen: "reports", level: 2, exercise: "Export trial balance and AR aging CSV." },
  { feature: "Secure trial balance", screen: "secure/trial-balance", level: 3, exercise: "Open Basic Auth page with admin / admin@123." },
  { feature: "Global search", screen: "dashboard", level: 4, exercise: "Use the top-bar search prompt to jump to Journals." },
  { feature: "Reset demo data", screen: "settings", level: 1, exercise: "Reset ERP seed and confirm dashboard counts restore." },
]

export function PracticePage() {
  return (
    <div className="mx-auto grid max-w-5xl gap-4">
      <PracticeSheet title="ERP practice" rows={rows} />
    </div>
  )
}
