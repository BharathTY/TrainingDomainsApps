import { useEffect, useRef, type ReactNode } from "react"
import { Button } from "@/components/ui/button"

export function NativeDialog({
  open,
  title,
  children,
  onClose,
}: {
  open: boolean
  title: string
  children: ReactNode
  onClose: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog ref={ref} data-testid="native-dialog" aria-label={title} className="rounded-lg border border-border bg-background p-4" onClose={onClose}>
      <h2 className="text-sm font-semibold">{title}</h2>
      <div className="py-3 text-sm">{children}</div>
      <Button type="button" variant="outline" data-testid="native-dialog-close" onClick={onClose}>
        Close
      </Button>
    </dialog>
  )
}
