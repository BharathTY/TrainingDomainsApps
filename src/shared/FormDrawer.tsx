import { zodResolver } from "@hookform/resolvers/zod"
import { useEffect } from "react"
import { Controller, useForm, type DefaultValues, type FieldValues, type Path } from "react-hook-form"
import type { ZodType } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"

export type DrawerField =
  | { name: string; label: string; type: "text" | "email" | "tel" | "number" | "date" | "time" | "datetime-local"; placeholder?: string }
  | { name: string; label: string; type: "textarea"; placeholder?: string }
  | { name: string; label: string; type: "select"; placeholder?: string; options: { label: string; value: string }[] }
  | { name: string; label: string; type: "switch" }

export function FormDrawer<T extends FieldValues>({
  open,
  onOpenChange,
  title,
  description,
  schema,
  defaultValues,
  fields,
  submitLabel = "Save",
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  schema: ZodType<T>
  defaultValues: DefaultValues<T>
  fields: DrawerField[]
  submitLabel?: string
  onSubmit: (values: T) => Promise<void> | void
}) {
  const form = useForm<T>({
    resolver: zodResolver(schema),
    defaultValues,
  })

  useEffect(() => {
    if (open) form.reset(defaultValues)
  }, [open, defaultValues, form])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          {description ? <SheetDescription>{description}</SheetDescription> : <SheetDescription>Required fields are marked.</SheetDescription>}
        </SheetHeader>
        <form
          data-testid="form-drawer"
          className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto"
          onSubmit={form.handleSubmit(async (values) => {
            await onSubmit(values)
            onOpenChange(false)
          })}
        >
          {fields.map((field) => (
            <Controller
              key={field.name}
              control={form.control}
              name={field.name as Path<T>}
              render={({ field: control, fieldState }) => (
                <div className="grid gap-1.5">
                  <Label htmlFor={field.name}>
                    {field.label}
                    {field.type === "switch" ? null : <span> *</span>}
                  </Label>
                  {field.type === "textarea" ? (
                    <Textarea id={field.name} placeholder={field.placeholder} {...control} value={String(control.value ?? "")} />
                  ) : null}
                  {field.type === "select" ? (
                    <Select value={String(control.value ?? "")} onValueChange={control.onChange}>
                      <SelectTrigger id={field.name}>
                        <SelectValue placeholder={field.placeholder ?? "Select"} />
                      </SelectTrigger>
                      <SelectContent>
                        {field.options.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : null}
                  {field.type === "switch" ? (
                    <Switch checked={Boolean(control.value)} onCheckedChange={control.onChange} aria-label={field.label} />
                  ) : null}
                  {field.type !== "textarea" && field.type !== "select" && field.type !== "switch" ? (
                    <Input
                      id={field.name}
                      type={field.type}
                      placeholder={field.placeholder}
                      {...control}
                      value={String(control.value ?? "")}
                    />
                  ) : null}
                  {fieldState.error?.message ? <p className="text-xs text-destructive">{fieldState.error.message}</p> : null}
                </div>
              )}
            />
          ))}
          <div className="mt-auto flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {submitLabel}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
