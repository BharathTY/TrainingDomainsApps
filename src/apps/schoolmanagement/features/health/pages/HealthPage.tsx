import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { ColumnDef } from "@tanstack/react-table"
import { useMemo, useState } from "react"
import { toast } from "sonner"
import { DataTable } from "@/shared/DataTable"
import { EmptyState } from "@/shared/EmptyState"
import { FormDrawer } from "@/shared/FormDrawer"
import { PageHeader } from "@/apps/schoolmanagement/components/PageHeader"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { can } from "@/apps/schoolmanagement/config/permissions"
import { healthKeys, listVaccines, listVisits, logVaccine, logVisit } from "@/apps/schoolmanagement/features/health/api"
import { vaccineSchema, visitSchema, type VaccineValues, type VisitValues } from "@/apps/schoolmanagement/features/health/schemas"
import type { InfirmaryVisit, Vaccination } from "@/apps/schoolmanagement/features/health/types"
import { listStudents, studentKeys } from "@/apps/schoolmanagement/features/students/api"
import { ApiError } from "@/shared/lib/api-client"
import { useUiStore } from "@/apps/schoolmanagement/stores/ui-store"

export function HealthPage() {
  const role = useUiStore((state) => state.role)
  const allowed = can(role, "health", "view")
  const canCreate = can(role, "health", "create")
  const queryClient = useQueryClient()
  const visits = useQuery({ queryKey: [...healthKeys.all, "visits"], queryFn: listVisits, enabled: allowed })
  const vaccines = useQuery({ queryKey: [...healthKeys.all, "vaccines"], queryFn: listVaccines, enabled: allowed })
  const students = useQuery({ queryKey: studentKeys.all, queryFn: listStudents, enabled: allowed && canCreate })
  const [visitOpen, setVisitOpen] = useState(false)
  const [vaccineOpen, setVaccineOpen] = useState(false)
  const refresh = () => queryClient.invalidateQueries({ queryKey: healthKeys.all })
  const saveVisit = useMutation({
    mutationFn: logVisit,
    onSuccess: async () => {
      toast("Visit logged")
      await refresh()
    },
    onError: (error) => toast(error instanceof ApiError ? error.message : "Could not log the visit"),
  })
  const saveVaccine = useMutation({
    mutationFn: logVaccine,
    onSuccess: async () => {
      toast("Vaccination logged")
      await refresh()
    },
    onError: (error) => toast(error instanceof ApiError ? error.message : "Could not log the vaccination"),
  })
  const visitColumns = useMemo<ColumnDef<InfirmaryVisit, unknown>[]>(
    () => [
      { accessorKey: "date", header: "Date" },
      { accessorKey: "studentName", header: "Student" },
      { accessorKey: "note", header: "Note" },
    ],
    [],
  )
  const vaccineColumns = useMemo<ColumnDef<Vaccination, unknown>[]>(
    () => [
      { accessorKey: "studentName", header: "Student" },
      { accessorKey: "name", header: "Vaccine" },
      { accessorKey: "date", header: "Date" },
    ],
    [],
  )
  const studentOptions = (students.data ?? []).filter((student) => student.status === "active").map((student) => ({ label: `${student.firstName} ${student.lastName}`, value: student.id }))
  const visitDefaults = useMemo<VisitValues>(
    () => ({ studentId: students.data?.find((student) => student.status === "active")?.id ?? "", date: "2026-09-30", note: "" }),
    [students.data],
  )
  const vaccineDefaults = useMemo<VaccineValues>(
    () => ({ studentId: students.data?.find((student) => student.status === "active")?.id ?? "", name: "", date: "2026-09-30" }),
    [students.data],
  )

  if (!allowed) return <EmptyState title="No access" description="Your account cannot open this module." />

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      <PageHeader
        title="Health"
        description="Infirmary visits and vaccinations."
        actions={
          canCreate ? (
            <>
              <Button type="button" variant="outline" onClick={() => setVaccineOpen(true)}>
                Log vaccination
              </Button>
              <Button type="button" onClick={() => setVisitOpen(true)}>
                Log visit
              </Button>
            </>
          ) : null
        }
      />
      <Tabs defaultValue="visits">
        <TabsList>
          <TabsTrigger value="visits">Infirmary</TabsTrigger>
          <TabsTrigger value="vaccines">Vaccinations</TabsTrigger>
        </TabsList>
        <TabsContent value="visits">
          <DataTable
            columns={visitColumns}
            data={visits.data ?? []}
            getRowId={(row) => row.id}
            isLoading={visits.isLoading}
            isError={visits.isError}
            onRetry={() => void visits.refetch()}
            searchPlaceholder="Search visits"
            filename="infirmary.csv"
            onCreate={canCreate ? () => setVisitOpen(true) : undefined}
            createLabel="Log visit"
            emptyTitle="No infirmary visits"
            emptyDescription="Log a visit when a student comes to the infirmary."
          />
        </TabsContent>
        <TabsContent value="vaccines">
          <DataTable
            columns={vaccineColumns}
            data={vaccines.data ?? []}
            getRowId={(row) => row.id}
            isLoading={vaccines.isLoading}
            isError={vaccines.isError}
            onRetry={() => void vaccines.refetch()}
            searchPlaceholder="Search vaccinations"
            filename="vaccinations.csv"
            onCreate={canCreate ? () => setVaccineOpen(true) : undefined}
            createLabel="Log vaccination"
            emptyTitle="No vaccinations"
            emptyDescription="Log a vaccination for a student."
          />
        </TabsContent>
      </Tabs>
      <FormDrawer
        open={visitOpen}
        onOpenChange={setVisitOpen}
        title="Log an infirmary visit"
        schema={visitSchema}
        defaultValues={visitDefaults}
        fields={[
          { name: "studentId", label: "Student", type: "select", options: studentOptions },
          { name: "date", label: "Date", type: "date" },
          { name: "note", label: "Note", type: "textarea" },
        ]}
        submitLabel="Log visit"
        onSubmit={async (values) => {
          await saveVisit.mutateAsync(values)
        }}
      />
      <FormDrawer
        open={vaccineOpen}
        onOpenChange={setVaccineOpen}
        title="Log a vaccination"
        schema={vaccineSchema}
        defaultValues={vaccineDefaults}
        fields={[
          { name: "studentId", label: "Student", type: "select", options: studentOptions },
          { name: "name", label: "Vaccine", type: "text" },
          { name: "date", label: "Date", type: "date" },
        ]}
        submitLabel="Log vaccination"
        onSubmit={async (values) => {
          await saveVaccine.mutateAsync(values)
        }}
      />
    </div>
  )
}
