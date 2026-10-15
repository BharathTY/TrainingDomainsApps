import { Link } from "react-router-dom"
import { z } from "zod"
import { CrudResourcePage, lookupOptions } from "@/apps/hospital/features/shared/CrudResourcePage"
import { appPath } from "@/shared/lib/app-context"

const BLOOD = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"]

export function PatientsPage() {
  return (
    <div className="space-y-2">
      <p className="mx-auto max-w-6xl text-sm text-muted-foreground">
        Open a profile after create: use the patient ID link in exported CSV or navigate to{" "}
        <Link className="underline" to={appPath("patients")}>the list</Link>. Detail route: <code>/hospital/patients/:id</code>
      </p>
      <CrudResourcePage
        title="Patients"
        description="Patient registration with synthetic demographics only. Duplicate phone numbers are rejected."
        queryKey={["hospital", "patients"]}
        path="/api/patients"
        moduleId="patients"
        createLabel="Register patient"
        detailPath="patients"
        columns={[
          { key: "patientNo", header: "Patient ID" },
          { key: "firstName", header: "First name" },
          { key: "lastName", header: "Last name" },
          { key: "gender", header: "Gender" },
          { key: "phone", header: "Phone" },
          { key: "bloodGroup", header: "Blood group" },
          { key: "assignedDoctor", header: "Doctor" },
          { key: "admissionStatus", header: "Admission" },
          { key: "registrationStatus", header: "Status" },
        ]}
        schema={z.object({
          firstName: z.string().min(1),
          lastName: z.string().min(1),
          dateOfBirth: z.string().min(1),
          gender: z.enum(["male", "female", "other"]),
          email: z.string().optional(),
          phone: z.string().min(8),
          address: z.string().optional(),
          emergencyContact: z.string().optional(),
          bloodGroup: z.string().optional(),
          assignedDoctorId: z.string().optional(),
          registrationStatus: z.enum(["active", "inactive"]),
        })}
        defaultValues={{
          firstName: "",
          lastName: "",
          dateOfBirth: "1990-01-01",
          gender: "female",
          email: "",
          phone: "",
          address: "",
          emergencyContact: "",
          bloodGroup: "O+",
          assignedDoctorId: "",
          registrationStatus: "active",
        }}
        toFormValues={(row) => ({
          firstName: String(row.firstName ?? ""),
          lastName: String(row.lastName ?? ""),
          dateOfBirth: String(row.dateOfBirth ?? "").slice(0, 10),
          gender: String(row.gender ?? "female"),
          email: String(row.email ?? ""),
          phone: String(row.phone ?? ""),
          address: String(row.address ?? ""),
          emergencyContact: String(row.emergencyContact ?? ""),
          bloodGroup: String(row.bloodGroup ?? "O+"),
          assignedDoctorId: String(row.assignedDoctorId ?? ""),
          registrationStatus: String(row.registrationStatus ?? "active"),
        })}
        fields={(lookups) => [
          { name: "firstName", label: "First name", type: "text" },
          { name: "lastName", label: "Last name", type: "text" },
          { name: "dateOfBirth", label: "Date of birth", type: "date" },
          {
            name: "gender",
            label: "Gender",
            type: "select",
            options: [
              { label: "Female", value: "female" },
              { label: "Male", value: "male" },
              { label: "Other", value: "other" },
            ],
          },
          { name: "email", label: "Email", type: "email" },
          { name: "phone", label: "Phone", type: "tel" },
          { name: "address", label: "Address", type: "textarea" },
          { name: "emergencyContact", label: "Emergency contact", type: "text" },
          { name: "bloodGroup", label: "Blood group (fictional)", type: "select", options: BLOOD.map((b) => ({ label: b, value: b })) },
          { name: "assignedDoctorId", label: "Assigned doctor", type: "select", options: lookupOptions(lookups.doctors) },
          {
            name: "registrationStatus",
            label: "Registration status",
            type: "select",
            options: [
              { label: "Active", value: "active" },
              { label: "Inactive", value: "inactive" },
            ],
          },
        ]}
      />
    </div>
  )
}
