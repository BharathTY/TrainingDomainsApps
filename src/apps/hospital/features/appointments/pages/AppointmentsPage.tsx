import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { z } from "zod"
import { CrudResourcePage, lookupOptions } from "@/apps/hospital/features/shared/CrudResourcePage"
import { Button } from "@/components/ui/button"
import { ApiError, api } from "@/shared/lib/api-client"

export function AppointmentsPage() {
  const queryClient = useQueryClient()
  const setStatus = useMutation({
    mutationFn: ({ id, status, cancelReason }: { id: string; status: string; cancelReason?: string }) =>
      api(`/api/appointments/${id}/status`, { method: "POST", body: JSON.stringify({ status, cancelReason }) }),
    onSuccess: async () => {
      toast("Appointment updated")
      await queryClient.invalidateQueries({ queryKey: ["hospital", "appointments"] })
    },
    onError: (error) => toast(error instanceof ApiError ? error.message : "Update failed"),
  })

  return (
    <div className="space-y-3">
      <CrudResourcePage
        title="Appointments"
        description="Schedule, reschedule, and update status. Overlapping doctor slots are rejected."
        queryKey={["hospital", "appointments"]}
        path="/api/appointments"
        moduleId="appointments"
        createLabel="Schedule appointment"
        columns={[
          { key: "appointmentNo", header: "Appointment ID" },
          { key: "patient", header: "Patient" },
          { key: "doctor", header: "Doctor" },
          { key: "appointmentDate", header: "Date" },
          { key: "startTime", header: "Start" },
          { key: "endTime", header: "End" },
          { key: "status", header: "Status" },
        ]}
        schema={z.object({
          patientId: z.string().min(1),
          doctorId: z.string().min(1),
          departmentId: z.string().optional(),
          appointmentDate: z.string().min(1),
          startTime: z.string().min(1),
          endTime: z.string().min(1),
          appointmentType: z.string().min(1),
          reason: z.string().optional(),
          notes: z.string().optional(),
          status: z.enum(["scheduled", "confirmed", "checked_in", "in_progress", "completed", "cancelled", "no_show"]),
        })}
        defaultValues={{
          patientId: "",
          doctorId: "",
          departmentId: "",
          appointmentDate: "2026-10-20",
          startTime: "10:00",
          endTime: "10:30",
          appointmentType: "consultation",
          reason: "",
          notes: "",
          status: "scheduled",
        }}
        toFormValues={(row) => ({
          patientId: String(row.patientId ?? ""),
          doctorId: String(row.doctorId ?? ""),
          departmentId: String(row.departmentId ?? ""),
          appointmentDate: String(row.appointmentDate ?? "").slice(0, 10),
          startTime: String(row.startTime ?? "").slice(0, 5),
          endTime: String(row.endTime ?? "").slice(0, 5),
          appointmentType: String(row.appointmentType ?? "consultation"),
          reason: String(row.reason ?? ""),
          notes: String(row.notes ?? ""),
          status: String(row.status ?? "scheduled"),
        })}
        fields={(lookups) => [
          { name: "patientId", label: "Patient", type: "select", options: lookupOptions(lookups.patients) },
          { name: "doctorId", label: "Doctor", type: "select", options: lookupOptions(lookups.doctors) },
          { name: "departmentId", label: "Department", type: "select", options: lookupOptions(lookups.departments) },
          { name: "appointmentDate", label: "Date", type: "date" },
          { name: "startTime", label: "Start time", type: "text", placeholder: "10:00" },
          { name: "endTime", label: "End time", type: "text", placeholder: "10:30" },
          { name: "appointmentType", label: "Type", type: "text" },
          { name: "reason", label: "Reason for visit", type: "textarea" },
          { name: "notes", label: "Notes", type: "textarea" },
          {
            name: "status",
            label: "Status",
            type: "select",
            options: ["scheduled", "confirmed", "checked_in", "in_progress", "completed", "cancelled", "no_show"].map((s) => ({
              label: s,
              value: s,
            })),
          },
        ]}
      />
      <section className="mx-auto max-w-6xl rounded-lg border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">Quick status actions (training)</h2>
        <p className="mt-1 text-sm text-muted-foreground">Cancel uses a native prompt for the reason — practice alert/confirm/prompt handling.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            type="button"
            data-testid="cancel-appointment-demo"
            variant="outline"
            onClick={() => {
              const id = window.prompt("Enter appointment UUID to cancel")
              if (!id) return
              if (!window.confirm("Cancel this appointment?")) return
              const reason = window.prompt("Cancellation reason") ?? "Patient request"
              setStatus.mutate({ id, status: "cancelled", cancelReason: reason })
            }}
          >
            Cancel via prompt
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              window.alert("Tip: use Edit on a row to confirm or check in an appointment.")
            }}
          >
            Show tip (alert)
          </Button>
        </div>
      </section>
    </div>
  )
}
