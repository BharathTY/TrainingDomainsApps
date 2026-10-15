import { z } from "zod"
import { CrudResourcePage, lookupOptions } from "@/apps/hospital/features/shared/CrudResourcePage"

const SPECIALIZATIONS = ["General Medicine", "Cardiology", "Orthopedics", "Pediatrics", "Neurology", "Gynecology", "Dermatology", "ENT"]

export function DoctorsPage() {
  return (
    <CrudResourcePage
      title="Doctors"
      description="Doctor directory with schedules and availability. Synthetic training profiles only."
      queryKey={["hospital", "doctors"]}
      path="/api/doctors"
      moduleId="doctors"
      createLabel="Register doctor"
      detailPath="doctors"
      columns={[
        { key: "doctorNo", header: "Doctor ID" },
        { key: "firstName", header: "First name" },
        { key: "lastName", header: "Last name" },
        { key: "specialization", header: "Specialization" },
        { key: "department", header: "Department" },
        { key: "consultationFee", header: "Fee" },
        { key: "availability", header: "Availability" },
        { key: "employmentStatus", header: "Status" },
      ]}
      schema={z.object({
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        specialization: z.string().min(1),
        departmentId: z.string().min(1),
        qualification: z.string().min(1),
        email: z.string().email(),
        phone: z.string().min(8),
        joiningDate: z.string().min(1),
        consultationFee: z.coerce.number().positive(),
        shiftStart: z.string().min(1),
        shiftEnd: z.string().min(1),
        availability: z.enum(["available", "busy", "on_leave"]),
        employmentStatus: z.enum(["active", "inactive"]),
      })}
      defaultValues={{
        firstName: "",
        lastName: "",
        specialization: "General Medicine",
        departmentId: "",
        qualification: "MD",
        email: "",
        phone: "",
        joiningDate: "2026-01-01",
        consultationFee: 500,
        shiftStart: "09:00",
        shiftEnd: "17:00",
        availability: "available",
        employmentStatus: "active",
      }}
      toFormValues={(row) => ({
        firstName: String(row.firstName ?? ""),
        lastName: String(row.lastName ?? ""),
        specialization: String(row.specialization ?? ""),
        departmentId: String(row.departmentId ?? ""),
        qualification: String(row.qualification ?? ""),
        email: String(row.email ?? ""),
        phone: String(row.phone ?? ""),
        joiningDate: String(row.joiningDate ?? "").slice(0, 10),
        consultationFee: Number(row.consultationFee ?? 500),
        shiftStart: String(row.shiftStart ?? "09:00").slice(0, 5),
        shiftEnd: String(row.shiftEnd ?? "17:00").slice(0, 5),
        availability: String(row.availability ?? "available"),
        employmentStatus: String(row.employmentStatus ?? "active"),
      })}
      fields={(lookups) => [
        { name: "firstName", label: "First name", type: "text" },
        { name: "lastName", label: "Last name", type: "text" },
        { name: "specialization", label: "Specialization", type: "select", options: SPECIALIZATIONS.map((s) => ({ label: s, value: s })) },
        { name: "departmentId", label: "Department", type: "select", options: lookupOptions(lookups.departments) },
        { name: "qualification", label: "Qualification", type: "text" },
        { name: "email", label: "Email", type: "email" },
        { name: "phone", label: "Phone", type: "tel" },
        { name: "joiningDate", label: "Joining date", type: "date" },
        { name: "consultationFee", label: "Consultation fee", type: "number" },
        { name: "shiftStart", label: "Shift start", type: "text", placeholder: "09:00" },
        { name: "shiftEnd", label: "Shift end", type: "text", placeholder: "17:00" },
        {
          name: "availability",
          label: "Availability",
          type: "select",
          options: [
            { label: "Available", value: "available" },
            { label: "Busy", value: "busy" },
            { label: "On leave", value: "on_leave" },
          ],
        },
        {
          name: "employmentStatus",
          label: "Employment status",
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
