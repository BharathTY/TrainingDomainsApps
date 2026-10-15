import { useQuery } from "@tanstack/react-query"
import { Link, useParams } from "react-router-dom"
import { PageHeader } from "@/apps/hospital/components/PageHeader"
import { Tabs } from "@/shared/Tabs"
import { api } from "@/shared/lib/api-client"
import { appPath } from "@/shared/lib/app-context"

type DoctorDetail = {
  doctor: Record<string, unknown>
  appointments: { appointmentNo: string; appointmentDate: string; startTime: string; status: string; patient: string }[]
  activity: { action: string; details: string; createdAt: string }[]
}

function field(row: Record<string, unknown>, camel: string, snake: string) {
  return String(row[camel] ?? row[snake] ?? "")
}

export function DoctorDetailPage() {
  const { doctorId = "" } = useParams()
  const query = useQuery({
    queryKey: ["hospital", "doctor", doctorId],
    queryFn: () => api<DoctorDetail>(`/api/doctors/${doctorId}`),
    enabled: Boolean(doctorId),
  })
  const doctor = query.data?.doctor

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      <PageHeader
        title={doctor ? `Dr. ${field(doctor, "firstName", "first_name")} ${field(doctor, "lastName", "last_name")}` : "Doctor profile"}
        description="Profile tabs for automation practice. Synthetic training data only."
        actions={
          <Link className="text-sm underline" to={appPath("doctors")}>
            Back to directory
          </Link>
        }
      />
      {query.isLoading ? <p className="text-sm text-muted-foreground">Loading doctor…</p> : null}
      {query.isError ? <p className="text-sm text-destructive" role="alert">Doctor not found.</p> : null}
      {doctor ? (
        <Tabs
          tabs={[
            {
              id: "overview",
              label: "Overview",
              content: (
                <dl className="grid gap-2 sm:grid-cols-2" data-testid="doctor-overview">
                  <div><dt className="text-muted-foreground">Doctor ID</dt><dd>{field(doctor, "doctorNo", "doctor_no")}</dd></div>
                  <div><dt className="text-muted-foreground">Specialization</dt><dd>{field(doctor, "specialization", "specialization")}</dd></div>
                  <div><dt className="text-muted-foreground">Department</dt><dd>{field(doctor, "department", "department")}</dd></div>
                  <div><dt className="text-muted-foreground">Availability</dt><dd>{field(doctor, "availability", "availability")}</dd></div>
                </dl>
              ),
            },
            {
              id: "personal",
              label: "Personal Details",
              content: (
                <address className="not-italic text-sm" data-testid="doctor-personal">
                  <p>Email: {field(doctor, "email", "email")}</p>
                  <p>Phone: {field(doctor, "phone", "phone")}</p>
                  <p>Qualification: {field(doctor, "qualification", "qualification")}</p>
                  <p>Fee: {field(doctor, "consultationFee", "consultation_fee")}</p>
                  <p>
                    Shift: {String(field(doctor, "shiftStart", "shift_start")).slice(0, 5)} –{" "}
                    {String(field(doctor, "shiftEnd", "shift_end")).slice(0, 5)}
                  </p>
                </address>
              ),
            },
            {
              id: "appointments",
              label: "Appointments",
              content: (
                <table className="w-full text-sm" data-testid="doctor-appointments">
                  <caption className="sr-only">Assigned appointments</caption>
                  <thead>
                    <tr>
                      <th scope="col">ID</th>
                      <th scope="col">Patient</th>
                      <th scope="col">Date</th>
                      <th scope="col">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(query.data?.appointments ?? []).map((row) => (
                      <tr key={row.appointmentNo}>
                        <td>{row.appointmentNo}</td>
                        <td>{row.patient}</td>
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
              content: <p className="text-sm text-muted-foreground">Ward assignments appear on patient admission records.</p>,
            },
            {
              id: "billing",
              label: "Billing",
              content: <p className="text-sm">Consultation fee: INR {field(doctor, "consultationFee", "consultation_fee")}</p>,
            },
            {
              id: "activity",
              label: "Activity Log",
              content: (
                <ul className="space-y-1 text-sm" data-testid="doctor-activity">
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
