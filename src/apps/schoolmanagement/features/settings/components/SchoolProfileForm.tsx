import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { EmptyState } from "@/shared/EmptyState"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { fetchProfile, saveProfile, settingsKeys } from "@/apps/schoolmanagement/features/settings/api"
import { profileSchema, type ProfileValues } from "@/apps/schoolmanagement/features/settings/schemas"
import { ApiError } from "@/shared/lib/api-client"

const fields: { name: keyof ProfileValues; label: string }[] = [
  { name: "name", label: "School name" },
  { name: "address", label: "Address" },
  { name: "phone", label: "Phone" },
  { name: "email", label: "Email" },
  { name: "board", label: "Board" },
  { name: "principal", label: "Principal" },
]

export function SchoolProfileForm({ canEdit }: { canEdit: boolean }) {
  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: settingsKeys.profile, queryFn: fetchProfile })
  const form = useForm<ProfileValues>({ resolver: zodResolver(profileSchema), defaultValues: { name: "", address: "", phone: "", email: "", board: "", principal: "" } })
  const save = useMutation({
    mutationFn: saveProfile,
    onSuccess: async (profile) => {
      queryClient.setQueryData(settingsKeys.profile, profile)
      toast("School profile saved")
    },
    onError: (error) => toast(error instanceof ApiError ? error.message : "Could not save the profile"),
  })

  useEffect(() => {
    if (query.data) form.reset(query.data)
  }, [query.data, form])

  if (query.isLoading) return <p className="text-sm text-muted-foreground">Loading the school profile…</p>
  if (query.isError) return <EmptyState title="Could not load the school profile" description="The profile did not load." actionLabel="Retry" onAction={() => void query.refetch()} />

  return (
    <form
      className="grid gap-3 md:grid-cols-2"
      onSubmit={form.handleSubmit(async (values) => {
        try {
          await save.mutateAsync(values)
        } catch {
          /* toast comes from the mutation */
        }
      })}
    >
      {fields.map((field) => (
        <div key={field.name} className={field.name === "address" ? "grid gap-1.5 md:col-span-2" : "grid gap-1.5"}>
          <Label htmlFor={field.name}>
            {field.label} <span className="text-destructive">*</span>
          </Label>
          <Input id={field.name} disabled={!canEdit} {...form.register(field.name)} />
          {form.formState.errors[field.name] ? <p className="text-xs text-destructive">{form.formState.errors[field.name]?.message}</p> : null}
        </div>
      ))}
      {canEdit ? (
        <div className="md:col-span-2">
          <Button type="submit" disabled={save.isPending}>
            Save profile
          </Button>
        </div>
      ) : null}
    </form>
  )
}
