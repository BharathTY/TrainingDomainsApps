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
import { issueBook, libraryKeys, listBooks, listLoans, returnBook } from "@/apps/schoolmanagement/features/library/api"
import { loanSchema, type LoanValues } from "@/apps/schoolmanagement/features/library/schemas"
import type { Book, Loan } from "@/apps/schoolmanagement/features/library/types"
import { listStudents, studentKeys } from "@/apps/schoolmanagement/features/students/api"
import { ApiError } from "@/shared/lib/api-client"
import { useUiStore } from "@/apps/schoolmanagement/stores/ui-store"

export function LibraryPage() {
  const role = useUiStore((state) => state.role)
  const allowed = can(role, "library", "view")
  const canCreate = can(role, "library", "create")
  const queryClient = useQueryClient()
  const books = useQuery({ queryKey: [...libraryKeys.all, "books"], queryFn: listBooks, enabled: allowed })
  const loans = useQuery({ queryKey: [...libraryKeys.all, "loans", role], queryFn: () => listLoans(role), enabled: allowed })
  const students = useQuery({ queryKey: studentKeys.all, queryFn: listStudents, enabled: allowed && canCreate })
  const [open, setOpen] = useState(false)
  const refresh = () => queryClient.invalidateQueries({ queryKey: libraryKeys.all })
  const issue = useMutation({
    mutationFn: issueBook,
    onSuccess: async () => {
      toast("Book issued")
      await refresh()
    },
    onError: (error) => toast(error instanceof ApiError ? error.message : "Could not issue the book"),
  })
  const giveBack = useMutation({
    mutationFn: returnBook,
    onSuccess: async () => {
      toast("Book returned")
      await refresh()
    },
    onError: (error) => toast(error instanceof ApiError ? error.message : "Could not return the book"),
  })
  const bookColumns = useMemo<ColumnDef<Book, unknown>[]>(
    () => [
      { accessorKey: "title", header: "Title" },
      { accessorKey: "author", header: "Author" },
      { accessorKey: "copies", header: "Copies" },
      { accessorKey: "available", header: "Available" },
    ],
    [],
  )
  const loanColumns = useMemo<ColumnDef<Loan, unknown>[]>(
    () => [
      { accessorKey: "bookTitle", header: "Book" },
      { accessorKey: "studentName", header: "Student" },
      { accessorKey: "issuedOn", header: "Issued" },
      { accessorKey: "dueOn", header: "Due" },
      {
        id: "returned",
        header: "Returned",
        enableHiding: false,
        cell: ({ row }) =>
          row.original.returnedOn ? (
            row.original.returnedOn
          ) : canCreate ? (
            <Button type="button" variant="outline" size="sm" onClick={() => giveBack.mutate(row.original.id)}>
              Return
            </Button>
          ) : (
            "Out"
          ),
      },
    ],
    [canCreate, giveBack],
  )
  const defaults = useMemo<LoanValues>(
    () => ({
      bookId: books.data?.find((book) => book.available > 0)?.id ?? "",
      studentId: students.data?.find((student) => student.status === "active")?.id ?? "",
      issuedOn: "2026-09-30",
      dueOn: "2026-10-08",
    }),
    [books.data, students.data],
  )
  const studentOptions = (students.data ?? [])
    .filter((student) => student.status === "active")
    .map((student) => ({ label: `${student.firstName} ${student.lastName}`, value: student.id }))
  const bookOptions = (books.data ?? []).filter((book) => book.available > 0).map((book) => ({ label: book.title, value: book.id }))

  if (!allowed) return <EmptyState title="No access" description="Your account cannot open this module." />

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      <PageHeader
        title="Library"
        description="Books on the shelf, and who has them out."
        actions={
          canCreate ? (
            <Button type="button" onClick={() => setOpen(true)}>
              Issue book
            </Button>
          ) : null
        }
      />
      <Tabs defaultValue="issues">
        <TabsList>
          <TabsTrigger value="issues">Issues</TabsTrigger>
          <TabsTrigger value="books">Books</TabsTrigger>
        </TabsList>
        <TabsContent value="issues">
          <DataTable
            columns={loanColumns}
            data={loans.data ?? []}
            getRowId={(row) => row.id}
            isLoading={loans.isLoading}
            isError={loans.isError}
            onRetry={() => void loans.refetch()}
            searchPlaceholder="Search issues"
            filename="library-issues.csv"
            onCreate={canCreate ? () => setOpen(true) : undefined}
            createLabel="Issue book"
            emptyTitle="No books issued"
            emptyDescription="Issue a book to a student."
          />
        </TabsContent>
        <TabsContent value="books">
          <DataTable
            columns={bookColumns}
            data={books.data ?? []}
            getRowId={(row) => row.id}
            isLoading={books.isLoading}
            isError={books.isError}
            onRetry={() => void books.refetch()}
            searchPlaceholder="Search books"
            filename="library-books.csv"
            emptyTitle="No books"
            emptyDescription="The catalogue is empty."
          />
        </TabsContent>
      </Tabs>
      <FormDrawer
        open={open}
        onOpenChange={setOpen}
        title="Issue a book"
        schema={loanSchema}
        defaultValues={defaults}
        fields={[
          { name: "bookId", label: "Book", type: "select", options: bookOptions },
          { name: "studentId", label: "Student", type: "select", options: studentOptions },
          { name: "issuedOn", label: "Issued on", type: "date" },
          { name: "dueOn", label: "Due on", type: "date" },
        ]}
        submitLabel="Issue"
        onSubmit={async (values) => {
          await issue.mutateAsync(values)
        }}
      />
    </div>
  )
}
