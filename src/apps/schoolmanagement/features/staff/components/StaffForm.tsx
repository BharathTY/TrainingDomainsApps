import { zodResolver } from "@hookform/resolvers/zod"
import { forwardRef, type ComponentProps } from "react"
import { useForm, useWatch } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { staffCreateSchema, type StaffCreateInput, type StaffCreateValues } from "@/apps/schoolmanagement/features/staff/schemas"
import { STAFF_ROLES, SUBJECTS } from "@/apps/schoolmanagement/features/staff/types"

const empty: StaffCreateInput = {
  firstName: "",
  lastName: "",
  role: "teacher",
  subject: "",
  phone: "",
  email: "",
}

export function StaffForm({
  open,
  onOpenChange,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: StaffCreateValues) => Promise<void>
}) {
  const form = useForm<StaffCreateInput, unknown, StaffCreateValues>({
    resolver: zodResolver(staffCreateSchema),
    defaultValues: empty,
  })
  const role = useWatch({ control: form.control, name: "role" })
  const subject = useWatch({ control: form.control, name: "subject" })

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (next) form.reset(empty)
        onOpenChange(next)
      }}
    >
      <SheetContent className="w-[min(100%,28rem)]">
        <SheetHeader>
          <SheetTitle>Add staff</SheetTitle>
          <SheetDescription>Teachers need a subject. Required fields are marked.</SheetDescription>
        </SheetHeader>
        <form
          className="grid gap-3 overflow-y-auto"
          onSubmit={form.handleSubmit(async (values) => {
            await onSubmit(values)
            form.reset(empty)
            onOpenChange(false)
          })}
        >
          <Text label="First name" required error={form.formState.errors.firstName?.message} {...form.register("firstName")} />
          <Text label="Last name" required error={form.formState.errors.lastName?.message} {...form.register("lastName")} />
          <Choice
            label="Role"
            required
            value={role}
            error={form.formState.errors.role?.message}
            onChange={(value) => form.setValue("role", value as StaffCreateInput["role"], { shouldValidate: true })}
            options={STAFF_ROLES.map((item) => ({ label: item === "teacher" ? "Teacher" : "Office", value: item }))}
          />
          {role === "teacher" ? (
            <Choice
              label="Subject"
              required
              value={subject}
              error={form.formState.errors.subject?.message}
              onChange={(value) => form.setValue("subject", value, { shouldValidate: true })}
              options={SUBJECTS.map((item) => ({ label: item, value: item }))}
            />
          ) : null}
          <Text label="Mobile" required type="tel" placeholder="98xxxxxxxx" error={form.formState.errors.phone?.message} {...form.register("phone")} />
          <Text label="Email" required type="email" error={form.formState.errors.email?.message} {...form.register("email")} />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Save staff</Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}

const Text = forwardRef<HTMLInputElement, { label: string; required?: boolean; error?: string } & ComponentProps<typeof Input>>(function Text(
  { label, required, error, ...props },
  ref,
) {
  return (
    <div className="grid gap-1.5">
      <Label>
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </Label>
      <Input ref={ref} {...props} />
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  )
})

function Choice({
  label,
  required,
  value,
  onChange,
  options,
  error,
}: {
  label: string
  required?: boolean
  value: string
  onChange: (value: string) => void
  options: { label: string; value: string }[]
  error?: string
}) {
  return (
    <div className="grid gap-1.5">
      <Label>
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </Label>
      <Select value={value || undefined} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder="Select" />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  )
}
