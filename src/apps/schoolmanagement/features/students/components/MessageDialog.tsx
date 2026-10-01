import { zodResolver } from "@hookform/resolvers/zod"
import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { messageSchema } from "@/apps/schoolmanagement/features/students/schemas"

export function MessageDialog({
  count,
  open,
  onOpenChange,
  onSend,
}: {
  count: number
  open: boolean
  onOpenChange: (open: boolean) => void
  onSend: (message: string) => Promise<void>
}) {
  const form = useForm<{ message: string }>({ resolver: zodResolver(messageSchema), defaultValues: { message: "" } })

  useEffect(() => {
    if (open) form.reset({ message: "" })
  }, [open, form])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send message</DialogTitle>
          <DialogDescription>
            This goes to the guardians of {count} selected student{count === 1 ? "" : "s"}.
          </DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-3"
          onSubmit={form.handleSubmit(async (values) => {
            await onSend(values.message)
            onOpenChange(false)
          })}
        >
          <div className="grid gap-1.5">
            <Label htmlFor="student-message">
              Message <span className="text-destructive">*</span>
            </Label>
            <Textarea id="student-message" {...form.register("message")} />
            {form.formState.errors.message?.message ? <p className="text-xs text-destructive">{form.formState.errors.message.message}</p> : null}
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              Send
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
