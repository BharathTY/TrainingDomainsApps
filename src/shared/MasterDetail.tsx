import type { ReactNode } from "react"
import { cn } from "@/shared/lib/utils"

export function MasterDetail({
  listTitle,
  listActions,
  toolbar,
  columnHeader,
  list,
  formTitle,
  formOpen,
  onClose,
  footer,
  children,
}: {
  listTitle: string
  listActions?: ReactNode
  toolbar?: ReactNode
  columnHeader: string
  list: ReactNode
  formTitle: string
  formOpen: boolean
  onClose: () => void
  footer?: ReactNode
  children: ReactNode
}) {
  return (
    <div data-layout="master-detail" className="flex h-[calc(100svh-6rem)] min-h-[28rem] overflow-hidden rounded-[6px] border border-border bg-card shadow-[0_1px_2px_rgba(0,0,0,0.06)]">
      <section data-panel="list" className="flex min-h-0 w-full min-w-0 flex-col overflow-hidden bg-muted md:w-[30%] md:border-r md:border-border">
        <div className="flex items-start justify-between gap-2 px-3 pb-2 pt-3">
          <h1 className="text-[14px] font-semibold">{listTitle}</h1>
          {listActions ? <div className="flex flex-wrap justify-end gap-2">{listActions}</div> : null}
        </div>
        {toolbar ? <div className="space-y-2 px-3 pb-2">{toolbar}</div> : null}
        <div className="sticky top-0 z-10 border-y border-border bg-muted px-3 py-2 text-[13px] font-medium">{columnHeader}</div>
        <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">{list}</div>
      </section>
      <section
        data-panel="form"
        className={cn(
          "min-h-0 min-w-0 flex-col overflow-hidden bg-card md:flex md:h-full md:w-[70%]",
          formOpen ? "fixed inset-0 z-40 flex md:static" : "hidden",
        )}
      >
        <header className="flex h-12 shrink-0 items-center justify-between border-b border-border px-4">
          <h2 className="text-[14px] font-semibold">{formTitle}</h2>
          <button
            type="button"
            aria-label="Close"
            className="grid size-8 place-items-center rounded-[6px] text-lg text-muted-foreground hover:bg-primary-soft"
            onClick={onClose}
          >
            ×
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">{children}</div>
        {footer ? <footer className="sticky bottom-0 flex justify-end gap-2 border-t border-border bg-card px-4 py-3">{footer}</footer> : null}
      </section>
    </div>
  )
}
