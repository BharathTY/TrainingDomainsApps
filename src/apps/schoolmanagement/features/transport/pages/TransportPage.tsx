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
import { listStudents, studentKeys } from "@/apps/schoolmanagement/features/students/api"
import { assignRoute, listAssignments, listRoutes, transportKeys } from "@/apps/schoolmanagement/features/transport/api"
import { assignmentSchema, type AssignmentValues } from "@/apps/schoolmanagement/features/transport/schemas"
import type { BusRoute, RouteAssignment } from "@/apps/schoolmanagement/features/transport/types"
import { ApiError } from "@/shared/lib/api-client"
import { useUiStore } from "@/apps/schoolmanagement/stores/ui-store"

export function TransportPage() {
  const role = useUiStore((state) => state.role)
  const allowed = can(role, "transport", "view")
  const canCreate = can(role, "transport", "create")
  const queryClient = useQueryClient()
  const routes = useQuery({ queryKey: [...transportKeys.all, "routes"], queryFn: listRoutes, enabled: allowed })
  const assignments = useQuery({ queryKey: [...transportKeys.all, "assignments"], queryFn: listAssignments, enabled: allowed })
  const students = useQuery({ queryKey: studentKeys.all, queryFn: listStudents, enabled: allowed && canCreate })
  const [open, setOpen] = useState(false)
  const save = useMutation({
    mutationFn: assignRoute,
    onSuccess: async () => {
      toast("Route assigned")
      await queryClient.invalidateQueries({ queryKey: transportKeys.all })
    },
    onError: (error) => toast(error instanceof ApiError ? error.message : "Could not assign the route"),
  })
  const routeColumns = useMemo<ColumnDef<BusRoute, unknown>[]>(
    () => [
      { accessorKey: "name", header: "Route" },
      { accessorKey: "vehicle", header: "Vehicle" },
      { accessorKey: "driver", header: "Driver" },
      { accessorKey: "stop", header: "Stop" },
      { accessorKey: "departure", header: "Departure" },
    ],
    [],
  )
  const assignmentColumns = useMemo<ColumnDef<RouteAssignment, unknown>[]>(
    () => [
      { accessorKey: "studentName", header: "Student" },
      { accessorKey: "routeName", header: "Route" },
      { accessorKey: "stop", header: "Stop" },
    ],
    [],
  )
  const defaults = useMemo<AssignmentValues>(
    () => ({
      routeId: routes.data?.[0]?.id ?? "",
      studentId: students.data?.find((student) => student.status === "active")?.id ?? "",
    }),
    [routes.data, students.data],
  )

  if (!allowed) return <EmptyState title="No access" description="Your account cannot open this module." />

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      <PageHeader
        title="Transport"
        description="Bus routes and the students on them."
        actions={
          canCreate ? (
            <Button type="button" onClick={() => setOpen(true)}>
              Assign route
            </Button>
          ) : null
        }
      />
      <Tabs defaultValue="assignments">
        <TabsList>
          <TabsTrigger value="assignments">Assignments</TabsTrigger>
          <TabsTrigger value="routes">Routes</TabsTrigger>
        </TabsList>
        <TabsContent value="assignments">
          <DataTable
            columns={assignmentColumns}
            data={assignments.data ?? []}
            getRowId={(row) => row.id}
            isLoading={assignments.isLoading}
            isError={assignments.isError}
            onRetry={() => void assignments.refetch()}
            searchPlaceholder="Search assignments"
            filename="transport-assignments.csv"
            onCreate={canCreate ? () => setOpen(true) : undefined}
            createLabel="Assign route"
            emptyTitle="No students on a route"
            emptyDescription="Assign a student to a bus route."
          />
        </TabsContent>
        <TabsContent value="routes">
          <DataTable
            columns={routeColumns}
            data={routes.data ?? []}
            getRowId={(row) => row.id}
            isLoading={routes.isLoading}
            isError={routes.isError}
            onRetry={() => void routes.refetch()}
            searchPlaceholder="Search routes"
            filename="transport-routes.csv"
            emptyTitle="No routes"
            emptyDescription="Routes have not been added."
          />
        </TabsContent>
      </Tabs>
      <FormDrawer
        open={open}
        onOpenChange={setOpen}
        title="Assign a route"
        schema={assignmentSchema}
        defaultValues={defaults}
        fields={[
          { name: "routeId", label: "Route", type: "select", options: (routes.data ?? []).map((route) => ({ label: `${route.name} · ${route.stop}`, value: route.id })) },
          {
            name: "studentId",
            label: "Student",
            type: "select",
            options: (students.data ?? []).filter((student) => student.status === "active").map((student) => ({ label: `${student.firstName} ${student.lastName}`, value: student.id })),
          },
        ]}
        submitLabel="Assign"
        onSubmit={async (values) => {
          await save.mutateAsync(values)
        }}
      />
    </div>
  )
}
