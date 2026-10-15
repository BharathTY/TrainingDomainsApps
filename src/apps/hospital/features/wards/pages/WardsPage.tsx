import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { toast } from "sonner"
import { z } from "zod"
import { PageHeader } from "@/apps/hospital/components/PageHeader"
import { asRows, loadPaged } from "@/apps/hospital/features/catalog/api"
import { CrudResourcePage } from "@/apps/hospital/features/shared/CrudResourcePage"
import { Button } from "@/components/ui/button"
import { ApiError, api } from "@/shared/lib/api-client"

export function WardsPage() {
  const [wardId, setWardId] = useState<string | null>(null)
  const queryClient = useQueryClient()
  const beds = useQuery({
    queryKey: ["hospital", "beds", wardId],
    queryFn: () => api<{ id: string; bedNo: string; status: string; patientName?: string }[]>(`/api/wards/${wardId}/beds`),
    enabled: Boolean(wardId),
  })
  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api(`/api/beds/${id}/status`, { method: "POST", body: JSON.stringify({ status }) }),
    onSuccess: async () => {
      toast("Bed status updated")
      await queryClient.invalidateQueries({ queryKey: ["hospital", "beds", wardId] })
      await queryClient.invalidateQueries({ queryKey: ["hospital", "wards"] })
    },
    onError: (error) => toast(error instanceof ApiError ? error.message : "Update failed"),
  })

  return (
    <div className="space-y-4">
      <CrudResourcePage
        title="Wards & beds"
        description="Ward capacity and bed status. Creating a ward also registers its beds."
        queryKey={["hospital", "wards"]}
        path="/api/wards"
        moduleId="wards"
        createLabel="Add ward"
        paged={false}
        columns={[
          { key: "wardNo", header: "Ward ID" },
          { key: "name", header: "Name" },
          { key: "wardType", header: "Type" },
          { key: "floorNumber", header: "Floor" },
          { key: "bedCapacity", header: "Capacity" },
          { key: "availableBeds", header: "Available" },
          { key: "occupiedBeds", header: "Occupied" },
          { key: "operationalStatus", header: "Status" },
        ]}
        schema={z.object({
          name: z.string().min(1),
          wardType: z.enum(["General", "ICU", "Emergency", "Maternity", "Pediatric", "Private"]),
          floorNumber: z.coerce.number().int().min(0),
          bedCapacity: z.coerce.number().int().positive(),
          operationalStatus: z.enum(["open", "closed"]),
        })}
        defaultValues={{ name: "", wardType: "General", floorNumber: 1, bedCapacity: 10, operationalStatus: "open" }}
        toFormValues={(row) => ({
          name: String(row.name ?? ""),
          wardType: String(row.wardType ?? "General"),
          floorNumber: Number(row.floorNumber ?? 1),
          bedCapacity: Number(row.bedCapacity ?? 10),
          operationalStatus: String(row.operationalStatus ?? "open"),
        })}
        fields={() => [
          { name: "name", label: "Ward name", type: "text" },
          {
            name: "wardType",
            label: "Ward type",
            type: "select",
            options: ["General", "ICU", "Emergency", "Maternity", "Pediatric", "Private"].map((v) => ({ label: v, value: v })),
          },
          { name: "floorNumber", label: "Floor", type: "number" },
          { name: "bedCapacity", label: "Bed capacity", type: "number" },
          {
            name: "operationalStatus",
            label: "Operational status",
            type: "select",
            options: [
              { label: "Open", value: "open" },
              { label: "Closed", value: "closed" },
            ],
          },
        ]}
      />
      <section className="mx-auto max-w-6xl rounded-lg border border-border bg-card p-4">
        <PageHeader title="Bed board" description="Select a ward from the list below to inspect beds." />
        <WardPicker onSelect={setWardId} selected={wardId} />
        {wardId ? (
          <table className="mt-3 w-full text-sm" data-testid="bed-board">
            <caption className="sr-only">Beds in selected ward</caption>
            <thead>
              <tr>
                <th scope="col" className="border-b py-2 text-left">Bed</th>
                <th scope="col" className="border-b py-2 text-left">Status</th>
                <th scope="col" className="border-b py-2 text-left">Patient</th>
                <th scope="col" className="border-b py-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(beds.data ?? []).map((bed) => (
                <tr key={bed.id} data-bed-id={bed.id}>
                  <td className="border-b py-2">{bed.bedNo}</td>
                  <td className="border-b py-2"><span data-status={bed.status}>{bed.status}</span></td>
                  <td className="border-b py-2">{bed.patientName ?? "—"}</td>
                  <td className="border-b py-2">
                    {bed.status !== "available" && !bed.patientName ? (
                      <Button type="button" size="sm" variant="outline" onClick={() => setStatus.mutate({ id: bed.id, status: "available" })}>
                        Mark available
                      </Button>
                    ) : null}
                    {bed.status === "available" ? (
                      <Button type="button" size="sm" variant="outline" onClick={() => setStatus.mutate({ id: bed.id, status: "maintenance" })}>
                        Maintenance
                      </Button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </section>
    </div>
  )
}

function WardPicker({ onSelect, selected }: { onSelect: (id: string) => void; selected: string | null }) {
  const wards = useQuery({
    queryKey: ["hospital", "wards"],
    queryFn: () => loadPaged<{ id: string; name: string; wardNo: string }>("/api/wards"),
  })
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {asRows(wards.data ?? []).map((ward) => (
        <Button key={ward.id} type="button" size="sm" variant={selected === ward.id ? "default" : "outline"} onClick={() => onSelect(ward.id)}>
          {ward.wardNo} {ward.name}
        </Button>
      ))}
    </div>
  )
}
