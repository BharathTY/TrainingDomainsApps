import type { ReactNode } from "react"
import { Button } from "@/components/ui/button"

export function Modal({
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
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" data-testid="modal">
      <div role="dialog" aria-modal="true" aria-label={title} className="w-full max-w-md rounded-lg border border-border bg-background p-4">
        <h2 className="text-sm font-semibold">{title}</h2>
        <div className="py-3 text-sm">{children}</div>
        <Button type="button" variant="outline" data-testid="modal-close" onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  )
}
