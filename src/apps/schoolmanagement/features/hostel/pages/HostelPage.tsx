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
import { allocateRoom, hostelKeys, listRooms, listStays } from "@/apps/schoolmanagement/features/hostel/api"
import { staySchema, type StayValues } from "@/apps/schoolmanagement/features/hostel/schemas"
import type { HostelRoom, HostelStay } from "@/apps/schoolmanagement/features/hostel/types"
import { listStudents, studentKeys } from "@/apps/schoolmanagement/features/students/api"
import { ApiError } from "@/shared/lib/api-client"
import { useUiStore } from "@/apps/schoolmanagement/stores/ui-store"

export function HostelPage() {
  const role = useUiStore((state) => state.role)
  const allowed = can(role, "hostel", "view")
  const canCreate = can(role, "hostel", "create")
  const queryClient = useQueryClient()
  const rooms = useQuery({ queryKey: [...hostelKeys.all, "rooms"], queryFn: listRooms, enabled: allowed })
  const stays = useQuery({ queryKey: [...hostelKeys.all, "stays"], queryFn: listStays, enabled: allowed })
  const students = useQuery({ queryKey: studentKeys.all, queryFn: listStudents, enabled: allowed && canCreate })
  const [open, setOpen] = useState(false)
  const save = useMutation({
    mutationFn: allocateRoom,
    onSuccess: async () => {
      toast("Room allocated")
      await queryClient.invalidateQueries({ queryKey: hostelKeys.all })
    },
    onError: (error) => toast(error instanceof ApiError ? error.message : "Could not allocate the room"),
  })
  const roomColumns = useMemo<ColumnDef<HostelRoom, unknown>[]>(
    () => [
      { accessorKey: "block", header: "Block" },
      { accessorKey: "number", header: "Room" },
      { accessorKey: "capacity", header: "Capacity" },
      { accessorKey: "occupied", header: "Occupied" },
    ],
    [],
  )
  const stayColumns = useMemo<ColumnDef<HostelStay, unknown>[]>(
    () => [
      { accessorKey: "studentName", header: "Student" },
      { accessorKey: "roomLabel", header: "Room" },
      { accessorKey: "since", header: "Since" },
    ],
    [],
  )
  const defaults = useMemo<StayValues>(
    () => ({
      roomId: rooms.data?.find((room) => room.occupied < room.capacity)?.id ?? rooms.data?.[0]?.id ?? "",
      studentId: students.data?.find((student) => student.status === "active")?.id ?? "",
      since: "2026-09-30",
    }),
    [rooms.data, students.data],
  )

  if (!allowed) return <EmptyState title="No access" description="Your account cannot open this module." />

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      <PageHeader
        title="Hostel"
        description="Rooms and who is staying in them."
        actions={
          canCreate ? (
            <Button type="button" onClick={() => setOpen(true)}>
              Allocate room
            </Button>
          ) : null
        }
      />
      <Tabs defaultValue="stays">
        <TabsList>
          <TabsTrigger value="stays">Allocations</TabsTrigger>
          <TabsTrigger value="rooms">Rooms</TabsTrigger>
        </TabsList>
        <TabsContent value="stays">
          <DataTable
            columns={stayColumns}
            data={stays.data ?? []}
            getRowId={(row) => row.id}
            isLoading={stays.isLoading}
            isError={stays.isError}
            onRetry={() => void stays.refetch()}
            searchPlaceholder="Search allocations"
            filename="hostel-stays.csv"
            onCreate={canCreate ? () => setOpen(true) : undefined}
            createLabel="Allocate room"
            emptyTitle="No hostel students"
            emptyDescription="Allocate a room to a student."
          />
        </TabsContent>
        <TabsContent value="rooms">
          <DataTable
            columns={roomColumns}
            data={rooms.data ?? []}
            getRowId={(row) => row.id}
            isLoading={rooms.isLoading}
            isError={rooms.isError}
            onRetry={() => void rooms.refetch()}
            searchPlaceholder="Search rooms"
            filename="hostel-rooms.csv"
            emptyTitle="No rooms"
            emptyDescription="Rooms have not been added."
          />
        </TabsContent>
      </Tabs>
      <FormDrawer
        open={open}
        onOpenChange={setOpen}
        title="Allocate a room"
        schema={staySchema}
        defaultValues={defaults}
        fields={[
          { name: "roomId", label: "Room", type: "select", options: (rooms.data ?? []).map((room) => ({ label: `${room.block}-${room.number} (${room.occupied}/${room.capacity})`, value: room.id })) },
          {
            name: "studentId",
            label: "Student",
            type: "select",
            options: (students.data ?? []).filter((student) => student.status === "active").map((student) => ({ label: `${student.firstName} ${student.lastName}`, value: student.id })),
          },
          { name: "since", label: "Since", type: "date" },
        ]}
        submitLabel="Allocate"
        onSubmit={async (values) => {
          await save.mutateAsync(values)
        }}
      />
    </div>
  )
}
