import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router-dom"
import { loadDashboard } from "@/apps/hospital/features/catalog/api"
import { appPath } from "@/shared/lib/app-context"

function Kpi({ label, value, to }: { label: string; value: string | number; to?: string }) {
  const body = (
    <article className="rounded-lg border border-border bg-card p-4" data-testid={`kpi-${label.toLowerCase().replace(/\s+/g, "-")}`}>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold">{value}</p>
    </article>
  )
  return to ? <Link to={to} className="block hover:opacity-90">{body}</Link> : body
}

export function DashboardPage() {
  const query = useQuery({ queryKey: ["hospital", "dashboard"], queryFn: loadDashboard })

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      <header className="space-y-1">
        <h1 className="text-lg font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">MediCare HMS overview from persisted synthetic hospital data.</p>
      </header>
      {query.isLoading ? <p className="text-sm text-muted-foreground" aria-live="polite">Loading dashboard…</p> : null}
      {query.isError ? (
        <p className="text-sm text-destructive" role="alert">
          Could not load dashboard.{" "}
          <button type="button" className="underline" onClick={() => void query.refetch()}>Retry</button>
        </p>
      ) : null}
      {query.data ? (
        <>
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Key metrics">
            <Kpi label="Doctors" value={query.data.doctors} to={appPath("doctors")} />
            <Kpi label="Patients" value={query.data.patients} to={appPath("patients")} />
            <Kpi label="Today appointments" value={query.data.todayAppointments} to={appPath("appointments")} />
            <Kpi label="Upcoming appointments" value={query.data.upcomingAppointments} to={appPath("calendar")} />
            <Kpi label="Beds available" value={query.data.beds.available} to={appPath("wards")} />
            <Kpi label="Beds occupied" value={query.data.beds.occupied} to={appPath("wards")} />
            <Kpi label="Beds maintenance" value={query.data.beds.maintenance} to={appPath("wards")} />
            <Kpi label="Current admissions" value={query.data.currentAdmissions} to={appPath("admissions")} />
            <Kpi label="Pending discharges" value={query.data.pendingDischarges} to={appPath("admissions")} />
          </section>
          <section className="grid gap-3 lg:grid-cols-2">
            <article className="rounded-lg border border-border bg-card p-4">
              <h2 className="text-sm font-semibold">Appointment status</h2>
              <table className="mt-3 w-full text-sm">
                <caption className="sr-only">Appointment counts by status</caption>
                <thead>
                  <tr>
                    <th scope="col" className="border-b py-2 text-left">Status</th>
                    <th scope="col" className="border-b py-2 text-right">Count</th>
                  </tr>
                </thead>
                <tbody>
                  {query.data.appointmentStatus.map((row) => (
                    <tr key={row.status}>
                      <td className="border-b py-2">{row.status}</td>
                      <td className="border-b py-2 text-right">{row.n}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </article>
            <article className="rounded-lg border border-border bg-card p-4">
              <h2 className="text-sm font-semibold">Ward occupancy</h2>
              <table className="mt-3 w-full text-sm">
                <caption className="sr-only">Occupied beds by ward</caption>
                <thead>
                  <tr>
                    <th scope="col" className="border-b py-2 text-left">Ward</th>
                    <th scope="col" className="border-b py-2 text-right">Occupied</th>
                    <th scope="col" className="border-b py-2 text-right">Capacity</th>
                  </tr>
                </thead>
                <tbody>
                  {query.data.wardOccupancy.map((row) => (
                    <tr key={row.name}>
                      <td className="border-b py-2">{row.name}</td>
                      <td className="border-b py-2 text-right">{row.occupied}</td>
                      <td className="border-b py-2 text-right">{row.capacity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </article>
          </section>
          <section className="rounded-lg border border-border bg-card p-4" aria-label="Notifications">
            <h2 className="text-sm font-semibold">Notifications & tasks</h2>
            <ul className="mt-2 space-y-2 text-sm">
              {query.data.notifications.map((item) => (
                <li key={item.id} className="rounded border border-border px-3 py-2">
                  <strong>{item.title}</strong>
                  <p className="text-muted-foreground">{item.body}</p>
                </li>
              ))}
            </ul>
          </section>
          <section className="rounded-lg border border-border bg-card p-4">
            <h2 className="text-sm font-semibold">Recent registrations</h2>
            <ul className="mt-2 space-y-1 text-sm">
              {query.data.recentRegistrations.map((row) => (
                <li key={row.id}>
                  <Link className="underline" to={appPath(`patients/${row.id}`)}>
                    {row.patientNo} · {row.firstName} {row.lastName}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </>
      ) : null}
    </div>
  )
}
