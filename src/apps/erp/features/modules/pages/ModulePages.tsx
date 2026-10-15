import { z } from "zod"
import { CrudResourcePage, lookupOptions } from "@/apps/erp/features/shared/CrudResourcePage"
import { ResourceListPage } from "@/apps/erp/features/shared/ResourceListPage"

export function OrganizationsPage() {
  return (
    <ResourceListPage
      title="Organizations"
      description="Legal entities, currency, and fiscal calendar (seeded master; edit via org admin policies)."
      queryKey={["erp", "organizations"]}
      path="/api/organizations"
      columns={[
        { key: "code", header: "Code" },
        { key: "name", header: "Name" },
        { key: "currencyCode", header: "Currency" },
        { key: "legalEntity", header: "Legal entity" },
      ]}
      paged={false}
    />
  )
}

export function DepartmentsPage() {
  return (
    <CrudResourcePage
      title="Departments"
      description="Hierarchy and cost-center mapping."
      queryKey={["erp", "departments"]}
      path="/api/departments"
      moduleId="departments"
      createLabel="Add department"
      columns={[
        { key: "code", header: "Code" },
        { key: "name", header: "Name" },
        { key: "costCenter", header: "Cost center" },
      ]}
      paged={false}
      schema={z.object({
        code: z.string().min(1, "Code is required"),
        name: z.string().min(1, "Name is required"),
        parentId: z.string().optional(),
      })}
      defaultValues={{ code: "", name: "", parentId: "none" }}
      toFormValues={(row) => ({
        code: String(row.code ?? ""),
        name: String(row.name ?? ""),
        parentId: String(row.parentId ?? "none") || "none",
      })}
      mapPayload={(values) => ({
        ...values,
        parentId: values.parentId === "none" ? null : values.parentId,
      })}
      fields={(lookups) => [
        { name: "code", label: "Code", type: "text" },
        { name: "name", label: "Name", type: "text" },
        {
          name: "parentId",
          label: "Parent department",
          type: "select",
          options: [{ label: "(none)", value: "none" }, ...lookupOptions(lookups.departments)],
        },
      ]}
    />
  )
}

export function EmployeesPage() {
  return (
    <CrudResourcePage
      title="Employees"
      description="Directory with department, designation, and employment status."
      queryKey={["erp", "employees"]}
      path="/api/employees"
      moduleId="employees"
      createLabel="Add employee"
      columns={[
        { key: "employeeNo", header: "Employee #" },
        { key: "firstName", header: "First name" },
        { key: "lastName", header: "Last name" },
        { key: "email", header: "Email" },
        { key: "department", header: "Department" },
        { key: "designation", header: "Designation" },
        { key: "status", header: "Status" },
        { key: "joiningDate", header: "Joined" },
      ]}
      schema={z.object({
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        email: z.string().email(),
        phone: z.string().optional(),
        departmentId: z.string().min(1, "Choose a department"),
        positionId: z.string().min(1, "Choose a designation"),
        location: z.string().optional(),
        status: z.enum(["active", "inactive", "exited"]),
        joiningDate: z.string().min(1),
      })}
      defaultValues={{
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        departmentId: "",
        positionId: "",
        location: "",
        status: "active",
        joiningDate: "2026-10-14",
      }}
      toFormValues={(row) => ({
        firstName: String(row.firstName ?? ""),
        lastName: String(row.lastName ?? ""),
        email: String(row.email ?? ""),
        phone: String(row.phone ?? ""),
        departmentId: String(row.departmentId ?? ""),
        positionId: String(row.positionId ?? ""),
        location: String(row.location ?? ""),
        status: String(row.status ?? "active"),
        joiningDate: String(row.joiningDate ?? "").slice(0, 10),
      })}
      fields={(lookups) => [
        { name: "firstName", label: "First name", type: "text" },
        { name: "lastName", label: "Last name", type: "text" },
        { name: "email", label: "Email", type: "email" },
        { name: "phone", label: "Phone", type: "tel" },
        { name: "departmentId", label: "Department", type: "select", options: lookupOptions(lookups.departments) },
        { name: "positionId", label: "Designation", type: "select", options: lookupOptions(lookups.positions) },
        { name: "location", label: "Location", type: "text" },
        {
          name: "status",
          label: "Status",
          type: "select",
          options: [
            { label: "Active", value: "active" },
            { label: "Inactive", value: "inactive" },
            { label: "Exited", value: "exited" },
          ],
        },
        { name: "joiningDate", label: "Joining date", type: "date" },
      ]}
    />
  )
}

export function AttendancePage() {
  return (
    <ResourceListPage
      title="Attendance"
      description="Check-in / check-out records (seeded; corrections via HR workflows)."
      queryKey={["erp", "attendance"]}
      path="/api/attendance"
      columns={[
        { key: "employeeNo", header: "Employee #" },
        { key: "employeeName", header: "Name" },
        { key: "workDate", header: "Date" },
        { key: "checkIn", header: "Check-in" },
        { key: "checkOut", header: "Check-out" },
        { key: "status", header: "Status" },
      ]}
    />
  )
}

export function LeavesPage() {
  return (
    <CrudResourcePage
      title="Leave"
      description="Leave applications. Approved leave cannot be edited or deleted."
      queryKey={["erp", "leaves"]}
      path="/api/leaves"
      moduleId="leaves"
      createLabel="Apply leave"
      columns={[
        { key: "employeeNo", header: "Employee #" },
        { key: "employeeName", header: "Name" },
        { key: "leaveType", header: "Type" },
        { key: "startDate", header: "Start" },
        { key: "endDate", header: "End" },
        { key: "days", header: "Days" },
        { key: "status", header: "Status" },
      ]}
      schema={z.object({
        leaveTypeId: z.string().min(1),
        startDate: z.string().min(1),
        endDate: z.string().min(1),
        reason: z.string().optional(),
      })}
      defaultValues={{ leaveTypeId: "", startDate: "2026-10-20", endDate: "2026-10-20", reason: "" }}
      toFormValues={(row) => ({
        leaveTypeId: String(row.leaveTypeId ?? ""),
        startDate: String(row.startDate ?? "").slice(0, 10),
        endDate: String(row.endDate ?? "").slice(0, 10),
        reason: String(row.reason ?? ""),
      })}
      fields={(lookups) => [
        { name: "leaveTypeId", label: "Leave type", type: "select", options: lookupOptions(lookups.leaveTypes) },
        { name: "startDate", label: "Start date", type: "date" },
        { name: "endDate", label: "End date", type: "date" },
        { name: "reason", label: "Reason", type: "text" },
      ]}
    />
  )
}

export function PayrollPage() {
  return (
    <ResourceListPage
      title="Payroll"
      description="Payroll runs. Use workflows for hire-to-retire posting; register is under Reports."
      queryKey={["erp", "payroll"]}
      path="/api/payroll"
      columns={[
        { key: "periodLabel", header: "Period" },
        { key: "startDate", header: "Start" },
        { key: "endDate", header: "End" },
        { key: "status", header: "Status" },
        { key: "approvedBy", header: "Approved by" },
      ]}
      paged={false}
    />
  )
}

export function RecruitmentPage() {
  return (
    <CrudResourcePage
      title="Recruitment"
      description="Job requisitions feeding the hire-to-retire pipeline."
      queryKey={["erp", "recruitment"]}
      path="/api/recruitment"
      moduleId="recruitment"
      createLabel="Add requisition"
      columns={[
        { key: "title", header: "Title" },
        { key: "departmentId", header: "Department" },
        { key: "status", header: "Status" },
        { key: "openings", header: "Openings" },
      ]}
      schema={z.object({
        title: z.string().min(1),
        departmentId: z.string().min(1),
        openings: z.coerce.number().int().positive(),
        status: z.enum(["draft", "approved", "closed"]),
      })}
      defaultValues={{ title: "", departmentId: "", openings: 1, status: "draft" }}
      toFormValues={(row) => ({
        title: String(row.title ?? ""),
        departmentId: String(row.departmentId ?? ""),
        openings: Number(row.openings ?? 1),
        status: String(row.status ?? "draft"),
      })}
      fields={(lookups) => [
        { name: "title", label: "Job title", type: "text" },
        { name: "departmentId", label: "Department", type: "select", options: lookupOptions(lookups.departments) },
        { name: "openings", label: "Openings", type: "number" },
        {
          name: "status",
          label: "Status",
          type: "select",
          options: [
            { label: "Draft", value: "draft" },
            { label: "Approved", value: "approved" },
            { label: "Closed", value: "closed" },
          ],
        },
      ]}
    />
  )
}

export function AccountsPage() {
  return (
    <CrudResourcePage
      title="Chart of accounts"
      description="Postable accounts. Accounts with journal lines cannot be deleted."
      queryKey={["erp", "accounts"]}
      path="/api/accounts"
      moduleId="accounts"
      createLabel="Add account"
      columns={[
        { key: "code", header: "Code" },
        { key: "name", header: "Name" },
        { key: "accountType", header: "Type" },
      ]}
      paged={false}
      schema={z.object({
        code: z.string().min(1),
        name: z.string().min(1),
        accountType: z.enum(["asset", "liability", "equity", "income", "expense"]),
      })}
      defaultValues={{ code: "", name: "", accountType: "expense" }}
      toFormValues={(row) => ({
        code: String(row.code ?? ""),
        name: String(row.name ?? ""),
        accountType: String(row.accountType ?? "expense"),
      })}
      fields={() => [
        { name: "code", label: "Code", type: "text" },
        { name: "name", label: "Name", type: "text" },
        {
          name: "accountType",
          label: "Type",
          type: "select",
          options: [
            { label: "Asset", value: "asset" },
            { label: "Liability", value: "liability" },
            { label: "Equity", value: "equity" },
            { label: "Income", value: "income" },
            { label: "Expense", value: "expense" },
          ],
        },
      ]}
    />
  )
}

export function ApPage() {
  return (
    <ResourceListPage
      title="Accounts payable"
      description="Vendor invoices. Create/match via Procure-to-Pay workflow actions."
      queryKey={["erp", "ap"]}
      path="/api/vendor-invoices"
      columns={[
        { key: "invoiceNo", header: "Invoice #" },
        { key: "vendor", header: "Vendor" },
        { key: "invoiceDate", header: "Date" },
        { key: "dueDate", header: "Due" },
        { key: "total", header: "Total" },
        { key: "status", header: "Status" },
        { key: "matchStatus", header: "Match" },
      ]}
    />
  )
}

export function ArPage() {
  return (
    <ResourceListPage
      title="Accounts receivable"
      description="Customer invoices. Generated from Order-to-Cash fulfillment."
      queryKey={["erp", "ar"]}
      path="/api/customer-invoices"
      columns={[
        { key: "invoiceNo", header: "Invoice #" },
        { key: "customer", header: "Customer" },
        { key: "invoiceDate", header: "Date" },
        { key: "dueDate", header: "Due" },
        { key: "amount", header: "Amount" },
        { key: "balance", header: "Balance" },
        { key: "status", header: "Status" },
      ]}
    />
  )
}

export function BankingPage() {
  return (
    <CrudResourcePage
      title="Banking & tax"
      description="Bank accounts. Balance must be zero to delete. Tax codes are demo-configurable under Reports."
      queryKey={["erp", "banking"]}
      path="/api/bank-accounts"
      moduleId="banking"
      createLabel="Add bank account"
      columns={[
        { key: "code", header: "Code" },
        { key: "name", header: "Name" },
        { key: "bankName", header: "Bank" },
        { key: "accountNo", header: "Account #" },
        { key: "balance", header: "Balance" },
      ]}
      schema={z.object({
        code: z.string().min(1),
        name: z.string().min(1),
        accountNo: z.string().min(1),
        bankName: z.string().min(1),
      })}
      defaultValues={{ code: "", name: "", accountNo: "", bankName: "" }}
      toFormValues={(row) => ({
        code: String(row.code ?? ""),
        name: String(row.name ?? ""),
        accountNo: String(row.accountNo ?? ""),
        bankName: String(row.bankName ?? ""),
      })}
      fields={() => [
        { name: "code", label: "Code", type: "text" },
        { name: "name", label: "Name", type: "text" },
        { name: "accountNo", label: "Account number", type: "text" },
        { name: "bankName", label: "Bank name", type: "text" },
      ]}
    />
  )
}

export function BudgetsPage() {
  return (
    <CrudResourcePage
      title="Budgets"
      description="Department budgets versus posted actuals."
      queryKey={["erp", "budgets"]}
      path="/api/budgets"
      moduleId="budgets"
      createLabel="Add budget"
      paged={false}
      columns={[
        { key: "department", header: "Department" },
        { key: "accountCode", header: "Account" },
        { key: "accountName", header: "Name" },
        { key: "budget", header: "Budget" },
        { key: "actual", header: "Actual" },
      ]}
      schema={z.object({
        departmentId: z.string().min(1),
        accountId: z.string().min(1),
        costCenterId: z.string().optional(),
        fiscalYear: z.coerce.number().int(),
        amount: z.coerce.number().positive(),
      })}
      defaultValues={{ departmentId: "", accountId: "", costCenterId: "", fiscalYear: 2026, amount: 100000 }}
      toFormValues={(row) => ({
        departmentId: String(row.departmentId ?? ""),
        accountId: String(row.accountId ?? ""),
        costCenterId: String(row.costCenterId ?? ""),
        fiscalYear: Number(row.fiscalYear ?? 2026),
        amount: Number(row.budget ?? row.amount ?? 0),
      })}
      fields={(lookups) => [
        { name: "departmentId", label: "Department", type: "select", options: lookupOptions(lookups.departments) },
        { name: "accountId", label: "Account", type: "select", options: lookupOptions(lookups.accounts) },
        { name: "costCenterId", label: "Cost center", type: "select", options: lookupOptions(lookups.costCenters) },
        { name: "fiscalYear", label: "Fiscal year", type: "number" },
        { name: "amount", label: "Budget amount", type: "number" },
      ]}
    />
  )
}

export function ExpensesPage() {
  return (
    <CrudResourcePage
      title="Expense claims"
      description="Submit claims with receipt name. Approved/reimbursed claims cannot be deleted."
      queryKey={["erp", "expenses"]}
      path="/api/expenses"
      moduleId="expenses"
      createLabel="Submit claim"
      paged={false}
      columns={[
        { key: "claimNo", header: "Claim #" },
        { key: "employeeName", header: "Employee" },
        { key: "amount", header: "Amount" },
        { key: "status", header: "Status" },
      ]}
      schema={z.object({
        amount: z.coerce.number().positive(),
        category: z.string().min(1),
        expenseDate: z.string().min(1),
        notes: z.string().optional(),
        costCenterId: z.string().optional(),
        receiptName: z.string().optional(),
      })}
      defaultValues={{
        amount: 1500,
        category: "Travel",
        expenseDate: "2026-10-14",
        notes: "",
        costCenterId: "",
        receiptName: "receipt.pdf",
      }}
      toFormValues={(row) => ({
        amount: Number(row.amount ?? 0),
        category: String(row.category ?? "Travel"),
        expenseDate: String(row.expenseDate ?? "").slice(0, 10),
        notes: String(row.notes ?? ""),
        costCenterId: String(row.costCenterId ?? ""),
        receiptName: String(row.receiptName ?? ""),
      })}
      fields={(lookups) => [
        { name: "amount", label: "Amount", type: "number" },
        { name: "category", label: "Category", type: "text" },
        { name: "expenseDate", label: "Expense date", type: "date" },
        { name: "costCenterId", label: "Cost center", type: "select", options: lookupOptions(lookups.costCenters) },
        { name: "receiptName", label: "Receipt file name", type: "text" },
        { name: "notes", label: "Notes", type: "text" },
      ]}
    />
  )
}

export function VendorsPage() {
  return (
    <CrudResourcePage
      title="Vendors"
      description="Vendor master and performance metric (on-time rate)."
      queryKey={["erp", "vendors"]}
      path="/api/vendors"
      moduleId="vendors"
      createLabel="Add vendor"
      columns={[
        { key: "code", header: "Code" },
        { key: "name", header: "Name" },
        { key: "city", header: "City" },
        { key: "phone", header: "Phone" },
        { key: "onTimeRate", header: "On-time %" },
        { key: "status", header: "Status" },
      ]}
      schema={z.object({
        code: z.string().min(1),
        name: z.string().min(1),
        email: z.string().optional(),
        phone: z.string().optional(),
        city: z.string().optional(),
        status: z.enum(["active", "inactive"]),
      })}
      defaultValues={{ code: "", name: "", email: "", phone: "", city: "", status: "active" }}
      toFormValues={(row) => ({
        code: String(row.code ?? ""),
        name: String(row.name ?? ""),
        email: String(row.email ?? ""),
        phone: String(row.phone ?? ""),
        city: String(row.city ?? ""),
        status: String(row.status ?? "active"),
      })}
      fields={() => [
        { name: "code", label: "Code", type: "text" },
        { name: "name", label: "Name", type: "text" },
        { name: "email", label: "Email", type: "email" },
        { name: "phone", label: "Phone", type: "tel" },
        { name: "city", label: "City", type: "text" },
        {
          name: "status",
          label: "Status",
          type: "select",
          options: [
            { label: "Active", value: "active" },
            { label: "Inactive", value: "inactive" },
          ],
        },
      ]}
    />
  )
}

export function CustomersPage() {
  return (
    <CrudResourcePage
      title="Customers"
      description="Customer profiles and payment terms linkage."
      queryKey={["erp", "customers"]}
      path="/api/customers"
      moduleId="customers"
      createLabel="Add customer"
      columns={[
        { key: "code", header: "Code" },
        { key: "name", header: "Name" },
        { key: "city", header: "City" },
        { key: "email", header: "Email" },
        { key: "status", header: "Status" },
      ]}
      schema={z.object({
        code: z.string().min(1),
        name: z.string().min(1),
        email: z.string().optional(),
        phone: z.string().optional(),
        city: z.string().optional(),
        status: z.enum(["active", "inactive"]),
      })}
      defaultValues={{ code: "", name: "", email: "", phone: "", city: "", status: "active" }}
      toFormValues={(row) => ({
        code: String(row.code ?? ""),
        name: String(row.name ?? ""),
        email: String(row.email ?? ""),
        phone: String(row.phone ?? ""),
        city: String(row.city ?? ""),
        status: String(row.status ?? "active"),
      })}
      fields={() => [
        { name: "code", label: "Code", type: "text" },
        { name: "name", label: "Name", type: "text" },
        { name: "email", label: "Email", type: "email" },
        { name: "phone", label: "Phone", type: "tel" },
        { name: "city", label: "City", type: "text" },
        {
          name: "status",
          label: "Status",
          type: "select",
          options: [
            { label: "Active", value: "active" },
            { label: "Inactive", value: "inactive" },
          ],
        },
      ]}
    />
  )
}

export function ItemsPage() {
  return (
    <CrudResourcePage
      title="Items"
      description="SKU master with reorder levels and on-hand quantity."
      queryKey={["erp", "items"]}
      path="/api/items"
      moduleId="items"
      createLabel="Add item"
      columns={[
        { key: "sku", header: "SKU" },
        { key: "name", header: "Name" },
        { key: "category", header: "Category" },
        { key: "uom", header: "UoM" },
        { key: "unitCost", header: "Cost" },
        { key: "reorderLevel", header: "Reorder" },
        { key: "onHand", header: "On hand" },
      ]}
      schema={z.object({
        sku: z.string().min(1),
        name: z.string().min(1),
        categoryId: z.string().min(1),
        uomId: z.string().min(1),
        unitCost: z.coerce.number().positive(),
        unitPrice: z.coerce.number().positive(),
        reorderLevel: z.coerce.number().int().min(0),
      })}
      defaultValues={{
        sku: "",
        name: "",
        categoryId: "",
        uomId: "",
        unitCost: 100,
        unitPrice: 135,
        reorderLevel: 10,
      }}
      toFormValues={(row) => ({
        sku: String(row.sku ?? ""),
        name: String(row.name ?? ""),
        categoryId: String(row.categoryId ?? ""),
        uomId: String(row.uomId ?? ""),
        unitCost: Number(row.unitCost ?? 0),
        unitPrice: Number(row.unitPrice ?? 0),
        reorderLevel: Number(row.reorderLevel ?? 0),
      })}
      fields={(lookups) => [
        { name: "sku", label: "SKU", type: "text" },
        { name: "name", label: "Name", type: "text" },
        { name: "categoryId", label: "Category", type: "select", options: lookupOptions(lookups.categories) },
        { name: "uomId", label: "Unit of measure", type: "select", options: lookupOptions(lookups.uoms) },
        { name: "unitCost", label: "Unit cost", type: "number" },
        { name: "unitPrice", label: "Unit price", type: "number" },
        { name: "reorderLevel", label: "Reorder level", type: "number" },
      ]}
    />
  )
}

export function WarehousesPage() {
  return (
    <CrudResourcePage
      title="Warehouses"
      description="Warehouses and storage locations. Delete blocked while stock remains."
      queryKey={["erp", "warehouses"]}
      path="/api/warehouses"
      moduleId="warehouses"
      createLabel="Add warehouse"
      columns={[
        { key: "code", header: "Code" },
        { key: "name", header: "Name" },
        { key: "city", header: "City" },
      ]}
      schema={z.object({
        code: z.string().min(1),
        name: z.string().min(1),
        city: z.string().optional(),
      })}
      defaultValues={{ code: "", name: "", city: "" }}
      toFormValues={(row) => ({
        code: String(row.code ?? ""),
        name: String(row.name ?? ""),
        city: String(row.city ?? ""),
      })}
      fields={() => [
        { name: "code", label: "Code", type: "text" },
        { name: "name", label: "Name", type: "text" },
        { name: "city", label: "City", type: "text" },
      ]}
    />
  )
}

export function InventoryPage() {
  return (
    <ResourceListPage
      title="Inventory ledger"
      description="Stock movement history. Adjust quantities through GRN, fulfillment, or warehouse workflows."
      queryKey={["erp", "inventory"]}
      path="/api/inventory/ledger"
      columns={[
        { key: "sku", header: "SKU" },
        { key: "item", header: "Item" },
        { key: "warehouse", header: "Warehouse" },
        { key: "direction", header: "Direction" },
        { key: "qty", header: "Qty" },
        { key: "refType", header: "Reference" },
        { key: "occurredOn", header: "Date" },
      ]}
    />
  )
}

export function ProcurementPage() {
  return (
    <CrudResourcePage
      title="Procurement"
      description="Purchase orders. Only draft/pending can be edited; only drafts can be deleted."
      queryKey={["erp", "procurement"]}
      path="/api/purchase-orders"
      moduleId="procurement"
      createLabel="Add purchase order"
      columns={[
        { key: "poNo", header: "PO #" },
        { key: "vendor", header: "Vendor" },
        { key: "status", header: "Status" },
        { key: "orderDate", header: "Order date" },
        { key: "expectedOn", header: "Expected" },
        { key: "totalAmount", header: "Total" },
      ]}
      schema={z.object({
        vendorId: z.string().min(1),
        warehouseId: z.string().min(1),
        itemId: z.string().min(1),
        qty: z.coerce.number().positive(),
        unitCost: z.coerce.number().positive(),
        expectedOn: z.string().optional(),
      })}
      defaultValues={{
        vendorId: "",
        warehouseId: "",
        itemId: "",
        qty: 1,
        unitCost: 1000,
        expectedOn: "2026-10-30",
      }}
      toFormValues={(row) => ({
        vendorId: String(row.vendorId ?? ""),
        warehouseId: String(row.warehouseId ?? ""),
        itemId: String(row.itemId ?? ""),
        qty: Number(row.qty ?? 1),
        unitCost: Number(row.unitCost ?? 0),
        expectedOn: String(row.expectedOn ?? "").slice(0, 10),
      })}
      fields={(lookups) => [
        { name: "vendorId", label: "Vendor", type: "select", options: lookupOptions(lookups.vendors) },
        { name: "warehouseId", label: "Warehouse", type: "select", options: lookupOptions(lookups.warehouses) },
        { name: "itemId", label: "Item", type: "select", options: lookupOptions(lookups.items) },
        { name: "qty", label: "Quantity", type: "number" },
        { name: "unitCost", label: "Unit cost", type: "number" },
        { name: "expectedOn", label: "Expected on", type: "date" },
      ]}
    />
  )
}

export function SalesPage() {
  return (
    <CrudResourcePage
      title="Sales orders"
      description="Customer orders. Only draft/pending can be edited; only drafts can be deleted."
      queryKey={["erp", "sales"]}
      path="/api/sales-orders"
      moduleId="sales"
      createLabel="Add sales order"
      columns={[
        { key: "soNo", header: "SO #" },
        { key: "customer", header: "Customer" },
        { key: "status", header: "Status" },
        { key: "orderDate", header: "Order date" },
        { key: "totalAmount", header: "Total" },
      ]}
      schema={z.object({
        customerId: z.string().min(1),
        warehouseId: z.string().min(1),
        itemId: z.string().min(1),
        qty: z.coerce.number().positive(),
        unitPrice: z.coerce.number().positive(),
      })}
      defaultValues={{
        customerId: "",
        warehouseId: "",
        itemId: "",
        qty: 1,
        unitPrice: 1500,
      }}
      toFormValues={(row) => ({
        customerId: String(row.customerId ?? ""),
        warehouseId: String(row.warehouseId ?? ""),
        itemId: String(row.itemId ?? ""),
        qty: Number(row.qty ?? 1),
        unitPrice: Number(row.unitPrice ?? 0),
      })}
      fields={(lookups) => [
        { name: "customerId", label: "Customer", type: "select", options: lookupOptions(lookups.customers) },
        { name: "warehouseId", label: "Warehouse", type: "select", options: lookupOptions(lookups.warehouses) },
        { name: "itemId", label: "Item", type: "select", options: lookupOptions(lookups.items) },
        { name: "qty", label: "Quantity", type: "number" },
        { name: "unitPrice", label: "Unit price", type: "number" },
      ]}
    />
  )
}

export function AssetsPage() {
  return (
    <CrudResourcePage
      title="Fixed assets"
      description="Asset register. Delete marks the asset disposed (audit-safe)."
      queryKey={["erp", "assets"]}
      path="/api/assets"
      moduleId="assets"
      createLabel="Add asset"
      deleteLabel="Dispose"
      deleteDescription="Marks the asset as disposed. Acquisition history is retained."
      columns={[
        { key: "assetNo", header: "Asset #" },
        { key: "name", header: "Name" },
        { key: "category", header: "Category" },
        { key: "acquisitionDate", header: "Acquired" },
        { key: "acquisitionCost", header: "Cost" },
        { key: "status", header: "Status" },
        { key: "location", header: "Location" },
      ]}
      schema={z.object({
        assetNo: z.string().min(1),
        name: z.string().min(1),
        category: z.string().min(1),
        acquisitionDate: z.string().min(1),
        acquisitionCost: z.coerce.number().positive(),
        location: z.string().optional(),
        status: z.enum(["active", "in_store", "disposed"]),
      })}
      defaultValues={{
        assetNo: "",
        name: "",
        category: "Laptop",
        acquisitionDate: "2026-10-14",
        acquisitionCost: 50000,
        location: "",
        status: "active",
      }}
      toFormValues={(row) => ({
        assetNo: String(row.assetNo ?? ""),
        name: String(row.name ?? ""),
        category: String(row.category ?? ""),
        acquisitionDate: String(row.acquisitionDate ?? "").slice(0, 10),
        acquisitionCost: Number(row.acquisitionCost ?? 0),
        location: String(row.location ?? ""),
        status: String(row.status ?? "active"),
      })}
      fields={() => [
        { name: "assetNo", label: "Asset number", type: "text" },
        { name: "name", label: "Name", type: "text" },
        { name: "category", label: "Category", type: "text" },
        { name: "acquisitionDate", label: "Acquisition date", type: "date" },
        { name: "acquisitionCost", label: "Acquisition cost", type: "number" },
        { name: "location", label: "Location", type: "text" },
        {
          name: "status",
          label: "Status",
          type: "select",
          options: [
            { label: "Active", value: "active" },
            { label: "In store", value: "in_store" },
            { label: "Disposed", value: "disposed" },
          ],
        },
      ]}
    />
  )
}

export function AuditPage() {
  return (
    <ResourceListPage
      title="Audit log"
      description="Permission-sensitive and posting actions with correlation IDs (append-only)."
      queryKey={["erp", "audit"]}
      path="/api/audit-logs"
      columns={[
        { key: "createdAt", header: "When" },
        { key: "actor", header: "Actor" },
        { key: "action", header: "Action" },
        { key: "entityType", header: "Entity" },
        { key: "entityId", header: "ID" },
        { key: "correlationId", header: "Correlation" },
      ]}
    />
  )
}
