import { useQuery } from "@tanstack/react-query"
import { Link, useParams } from "react-router-dom"
import { PageHeader } from "@/apps/hospital/components/PageHeader"
import { Tabs } from "@/shared/Tabs"
import { api } from "@/shared/lib/api-client"
import { appPath } from "@/shared/lib/app-context"

type PatientDetail = {
  patient: Record<string, unknown>
  appointments: { appointmentNo: string; appointmentDate: string; status: string; doctor: string }[]
  admissions: { admissionNo: string; status: string; admittedAt: string; dischargedAt?: string; ward: string; bedNo: string }[]
  invoices: { invoiceNo: string; amount: number; status: string; issuedOn: string }[]
  activity: { action: string; details: string; createdAt: string }[]
}

function field(row: Record<string, unknown>, camel: string, snake: string) {
  return String(row[camel] ?? row[snake] ?? "")
}

export function PatientDetailPage() {
  const { patientId = "" } = useParams()
  const query = useQuery({
    queryKey: ["hospital", "patient", patientId],
    queryFn: () => api<PatientDetail>(`/api/patients/${patientId}`),
    enabled: Boolean(patientId),
  })
  const patient = query.data?.patient

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      <PageHeader
        title={
          patient
            ? `${field(patient, "firstName", "first_name")} ${field(patient, "lastName", "last_name")}`
            : "Patient profile"
        }
        description="In-app tabs for locator practice. Synthetic demographics only."
        actions={
          <Link className="text-sm underline" to={appPath("patients")}>
            Back to patients
          </Link>
        }
      />
      {query.isLoading ? <p className="text-sm text-muted-foreground">Loading patient…</p> : null}
      {query.isError ? <p className="text-sm text-destructive" role="alert">Patient not found.</p> : null}
      {patient ? (
        <Tabs
          tabs={[
            {
              id: "overview",
              label: "Overview",
              content: (
                <dl className="grid gap-2 sm:grid-cols-2" data-testid="patient-overview">
                  <div><dt className="text-muted-foreground">Patient ID</dt><dd id="patient-no">{field(patient, "patientNo", "patient_no")}</dd></div>
                  <div><dt className="text-muted-foreground">Status</dt><dd>{field(patient, "registrationStatus", "registration_status")}</dd></div>
                  <div><dt className="text-muted-foreground">Admission</dt><dd>{field(patient, "admissionStatus", "admission_status")}</dd></div>
                  <div><dt className="text-muted-foreground">Blood group</dt><dd>{field(patient, "bloodGroup", "blood_group")}</dd></div>
                </dl>
              ),
            },
            {
              id: "personal",
              label: "Personal Details",
              content: (
                <address className="not-italic text-sm" data-testid="patient-personal">
                  <p>DOB: {String(field(patient, "dateOfBirth", "date_of_birth")).slice(0, 10)}</p>
                  <p>Gender: {field(patient, "gender", "gender")}</p>
                  <p>Email: {field(patient, "email", "email")}</p>
                  <p>Phone: {field(patient, "phone", "phone")}</p>
                  <p>Address: {field(patient, "address", "address")}</p>
                  <p>Emergency: {field(patient, "emergencyContact", "emergency_contact")}</p>
                </address>
              ),
            },
            {
              id: "appointments",
              label: "Appointments",
              content: (
                <table className="w-full text-sm" data-testid="patient-appointments">
                  <caption className="sr-only">Appointment history</caption>
                  <thead>
                    <tr>
                      <th scope="col">ID</th>
                      <th scope="col">Doctor</th>
                      <th scope="col">Date</th>
                      <th scope="col">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(query.data?.appointments ?? []).map((row) => (
                      <tr key={row.appointmentNo}>
                        <td>{row.appointmentNo}</td>
                        <td>{row.doctor}</td>
                        <td>{String(row.appointmentDate).slice(0, 10)}</td>
                        <td>{row.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ),
            },
            {
              id: "admission",
              label: "Admission History",
              content: (
                <table className="w-full text-sm" data-testid="patient-admissions">
                  <caption className="sr-only">Admissions</caption>
                  <thead>
                    <tr>
                      <th scope="col">Admission</th>
                      <th scope="col">Ward / bed</th>
                      <th scope="col">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(query.data?.admissions ?? []).map((row) => (
                      <tr key={row.admissionNo}>
                        <td>{row.admissionNo}</td>
                        <td>
                          {row.ward} / {row.bedNo}
                        </td>
                        <td>{row.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ),
            },
            {
              id: "billing",
              label: "Billing",
              content: (
                <table className="w-full text-sm" data-testid="patient-billing">
                  <caption className="sr-only">Invoices</caption>
                  <thead>
                    <tr>
                      <th scope="col">Invoice</th>
                      <th scope="col">Amount</th>
                      <th scope="col">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(query.data?.invoices ?? []).map((row) => (
                      <tr key={row.invoiceNo}>
                        <td>{row.invoiceNo}</td>
                        <td>{row.amount}</td>
                        <td>{row.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ),
            },
            {
              id: "activity",
              label: "Activity Log",
              content: (
                <ul className="space-y-1 text-sm" data-testid="patient-activity">
                  {(query.data?.activity ?? []).map((row, index) => (
                    <li key={`${row.createdAt}-${index}`}>
                      <strong>{row.action}</strong> — {row.details}
                    </li>
                  ))}
                  {(query.data?.activity ?? []).length === 0 ? <li>No activity yet.</li> : null}
                </ul>
              ),
            },
          ]}
        />
      ) : null}
    </div>
  )
}
