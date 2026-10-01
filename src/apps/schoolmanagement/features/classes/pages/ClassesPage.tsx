import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ChevronDown, ChevronRight } from "lucide-react"
import { useMemo, useState } from "react"
import { toast } from "sonner"
import { EmptyState } from "@/shared/EmptyState"
import { PageHeader } from "@/apps/schoolmanagement/components/PageHeader"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { can } from "@/apps/schoolmanagement/config/permissions"
import { assignClassTeacher, classesKeys, listClasses } from "@/apps/schoolmanagement/features/classes/api"
import type { SchoolClass } from "@/apps/schoolmanagement/features/classes/types"
import { listStaff, staffKeys } from "@/apps/schoolmanagement/features/staff/api"
import { ApiError } from "@/shared/lib/api-client"
import { useUiStore } from "@/apps/schoolmanagement/stores/ui-store"

export function ClassesPage() {
  const role = useUiStore((state) => state.role)
  const allowed = can(role, "classes", "view")
  const queryClient = useQueryClient()
  const classesQuery = useQuery({ queryKey: classesKeys.all, queryFn: listClasses, enabled: allowed })
  const staffQuery = useQuery({ queryKey: staffKeys.all, queryFn: listStaff, enabled: allowed })
  const [openIds, setOpenIds] = useState<string[]>(["6"])
  const [search, setSearch] = useState("")
  const canEdit = can(role, "classes", "edit")

  const assign = useMutation({
    mutationFn: ({ sectionId, teacherId }: { sectionId: string; teacherId: string | null }) => assignClassTeacher(sectionId, teacherId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: classesKeys.all })
      toast("Class teacher updated")
    },
    onError: (error) => toast(error instanceof ApiError ? error.message : "Could not assign the class teacher"),
  })

  const teachers = useMemo(
    () =>
      (staffQuery.data ?? [])
        .filter((member) => member.role === "teacher" && member.status === "active")
        .map((member) => ({ id: member.id, name: `${member.firstName} ${member.lastName}` })),
    [staffQuery.data],
  )
  const teacherName = useMemo(() => {
    const names = new Map((staffQuery.data ?? []).map((member) => [member.id, `${member.firstName} ${member.lastName}`]))
    return (id: string | null) => (id ? (names.get(id) ?? "Teacher") : "Unassigned")
  }, [staffQuery.data])

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase()
    const classes = classesQuery.data ?? []
    if (!needle) return classes
    return classes
      .map((item) => ({
        ...item,
        sections: item.sections.filter((section) => {
          const label = `${item.name} ${section.section} ${teacherName(section.classTeacherId)}`.toLowerCase()
          return label.includes(needle)
        }),
      }))
      .filter((item) => item.sections.length > 0 || item.name.toLowerCase().includes(needle))
  }, [classesQuery.data, search, teacherName])

  if (!allowed) {
    return <EmptyState title="No access" description="Your account cannot open this module." />
  }

  const expanded = search.trim() ? visible.map((item) => item.id) : openIds

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      <PageHeader title="Classes" description="Classes 1–12, sections A–D, and the class teacher for each section." />
      <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search class or teacher" aria-label="Search classes" />
      {classesQuery.isLoading ? <p className="text-sm text-muted-foreground">Loading classes…</p> : null}
      {classesQuery.isError ? (
        <EmptyState title="Could not load classes" description="The class list did not load." actionLabel="Retry" onAction={() => void classesQuery.refetch()} />
      ) : null}
      {!classesQuery.isLoading && !classesQuery.isError && visible.length === 0 ? (
        <EmptyState title="No classes" description="Nothing matches that search." />
      ) : null}
      <ul className="grid gap-2">
        {visible.map((item) => (
          <ClassNode
            key={item.id}
            item={item}
            open={expanded.includes(item.id)}
            onToggle={() => setOpenIds((current) => (current.includes(item.id) ? current.filter((id) => id !== item.id) : [...current, item.id]))}
            teacherName={teacherName}
            teachers={teachers}
            canEdit={canEdit}
            onAssign={(sectionId, teacherId) => assign.mutate({ sectionId, teacherId })}
          />
        ))}
      </ul>
    </div>
  )
}

function ClassNode({
  item,
  open,
  onToggle,
  teacherName,
  teachers,
  canEdit,
  onAssign,
}: {
  item: SchoolClass
  open: boolean
  onToggle: () => void
  teacherName: (id: string | null) => string
  teachers: { id: string; name: string }[]
  canEdit: boolean
  onAssign: (sectionId: string, teacherId: string | null) => void
}) {
  return (
    <li className="rounded-md border border-border">
      <Button type="button" variant="ghost" className="h-9 w-full justify-start px-2" aria-expanded={open} onClick={onToggle}>
        {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
        {item.name}
        <span className="text-muted-foreground">{item.sections.length} sections</span>
      </Button>
      {open ? (
        <ul className="border-t border-border">
          {item.sections.map((section) => (
            <li key={section.id} className="flex flex-col gap-2 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium">Section {section.section}</p>
                <p className="text-xs text-muted-foreground">Class teacher: {teacherName(section.classTeacherId)}</p>
              </div>
              {canEdit ? (
                <Select value={section.classTeacherId ?? "none"} onValueChange={(value) => onAssign(section.id, value === "none" ? null : value)}>
                  <SelectTrigger className="w-full sm:w-64" aria-label={`Class teacher for ${item.name} ${section.section}`}>
                    <SelectValue placeholder="Assign class teacher" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Unassigned</SelectItem>
                    {teachers.map((teacher) => (
                      <SelectItem key={teacher.id} value={teacher.id}>
                        {teacher.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  )
}
