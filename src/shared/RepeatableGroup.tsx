import type { ReactNode } from "react"
import { cn } from "@/shared/lib/utils"

export function RepeatableGroup({
  legend,
  items,
  onAdd,
  onRemove,
  children,
}: {
  legend: string
  items: { id: string }[]
  onAdd: () => void
  onRemove: (id: string) => void
  children: (item: { id: string }, index: number) => ReactNode
}) {
  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <section key={item.id} className="rounded-[6px] border border-border bg-card p-3 shadow-[0_1px_2px_rgba(0,0,0,0.06)]">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h4 className="text-[13px] font-medium text-foreground">
              # {legend} {index + 1}
            </h4>
            {index === 0 ? (
              <button type="button" className="text-[13px] font-medium text-primary" onClick={onAdd}>
                + Add
              </button>
            ) : (
              <button
                type="button"
                className="grid size-6 place-items-center rounded-[6px] text-muted-foreground hover:bg-primary-soft"
                aria-label={`Remove ${legend} ${index + 1}`}
                onClick={() => onRemove(item.id)}
              >
                ×
              </button>
            )}
          </div>
          <div className={cn("grid grid-cols-1 gap-4 md:grid-cols-2")}>{children(item, index)}</div>
        </section>
      ))}
    </div>
  )
}
