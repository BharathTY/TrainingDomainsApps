import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { ColumnDef } from "@tanstack/react-table"
import { useMemo, useState } from "react"
import { toast } from "sonner"
import { DataTable } from "@/shared/DataTable"
import { EmptyState } from "@/shared/EmptyState"
import { FormDrawer } from "@/shared/FormDrawer"
import { PageHeader } from "@/apps/schoolmanagement/components/PageHeader"
import { Button } from "@/components/ui/button"
import { can } from "@/apps/schoolmanagement/config/permissions"
import { certificatesKeys, issueCertificate, listCertificates, requestCertificate } from "@/apps/schoolmanagement/features/certificates/api"
import { certificateSchema, type CertificateValues } from "@/apps/schoolmanagement/features/certificates/schemas"
import { CERTIFICATE_TYPES, type CertificateRequest } from "@/apps/schoolmanagement/features/certificates/types"
import { listStudents, studentKeys } from "@/apps/schoolmanagement/features/students/api"
import { ApiError } from "@/shared/lib/api-client"
import { useUiStore } from "@/apps/schoolmanagement/stores/ui-store"

const TYPE_LABEL = { transfer: "Transfer", bonafide: "Bonafide", character: "Character" } as const
const STATUS_LABEL = { requested: "Requested", ready: "Ready", issued: "Issued" } as const

export function CertificatesPage() {
  const role = useUiStore((state) => state.role)
  const allowed = can(role, "certificates", "view")
  const canCreate = can(role, "certificates", "create")
  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: certificatesKeys.all, queryFn: listCertificates, enabled: allowed })
  const students = useQuery({ queryKey: studentKeys.all, queryFn: listStudents, enabled: allowed && canCreate })
  const [open, setOpen] = useState(false)
  const refresh = () => queryClient.invalidateQueries({ queryKey: certificatesKeys.all })
  const request = useMutation({
    mutationFn: requestCertificate,
    onSuccess: async () => {
      toast("Certificate requested")
      await refresh()
    },
    onError: (error) => toast(error instanceof ApiError ? error.message : "Could not request the certificate"),
  })
  const issue = useMutation({
    mutationFn: issueCertificate,
    onSuccess: async () => {
      toast("Certificate issued")
      await refresh()
    },
    onError: (error) => toast(error instanceof ApiError ? error.message : "Could not issue the certificate"),
  })
  const columns = useMemo<ColumnDef<CertificateRequest, unknown>[]>(
    () => [
      { accessorKey: "studentName", header: "Student" },
      { id: "type", header: "Certificate", accessorFn: (row) => TYPE_LABEL[row.type] },
      { id: "status", header: "Status", accessorFn: (row) => STATUS_LABEL[row.status] },
      { accessorKey: "requestedOn", header: "Requested" },
      {
        id: "issue",
        header: "",
        enableHiding: false,
        enableSorting: false,
        cell: ({ row }) =>
          canCreate && row.original.status !== "issued" ? (
            <Button type="button" variant="outline" size="sm" onClick={() => issue.mutate(row.original.id)}>
              Issue
            </Button>
          ) : null,
      },
    ],
    [canCreate, issue],
  )
  const defaults = useMemo<CertificateValues>(
    () => ({ studentId: students.data?.find((student) => student.status === "active")?.id ?? "", type: "bonafide" }),
    [students.data],
  )

  if (!allowed) return <EmptyState title="No access" description="Your account cannot open this module." />

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      <PageHeader
        title="Certificates"
        description="Transfer, bonafide, and character certificates."
        actions={
          canCreate ? (
            <Button type="button" onClick={() => setOpen(true)}>
              Request
            </Button>
          ) : null
        }
      />
      <DataTable
        columns={columns}
        data={query.data ?? []}
        getRowId={(row) => row.id}
        isLoading={query.isLoading}
        isError={query.isError}
        onRetry={() => void query.refetch()}
        searchPlaceholder="Search certificates"
        filename="certificates.csv"
        onCreate={canCreate ? () => setOpen(true) : undefined}
        createLabel="Request"
        emptyTitle="No certificate requests"
        emptyDescription="Request a certificate for a student."
      />
      <FormDrawer
        open={open}
        onOpenChange={setOpen}
        title="Request a certificate"
        schema={certificateSchema}
        defaultValues={defaults}
        fields={[
          {
            name: "studentId",
            label: "Student",
            type: "select",
            options: (students.data ?? []).filter((student) => student.status === "active").map((student) => ({ label: `${student.firstName} ${student.lastName}`, value: student.id })),
          },
          { name: "type", label: "Certificate", type: "select", options: CERTIFICATE_TYPES.map((type) => ({ label: TYPE_LABEL[type], value: type })) },
        ]}
        submitLabel="Request"
        onSubmit={async (values) => {
          await request.mutateAsync(values)
        }}
      />
    </div>
  )
}
