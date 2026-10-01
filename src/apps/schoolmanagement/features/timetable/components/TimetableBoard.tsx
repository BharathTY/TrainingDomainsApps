import { DndContext, DragOverlay, PointerSensor, closestCenter, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core"
import { CSS } from "@dnd-kit/utilities"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { PERIODS, PERIOD_TIME, WEEKDAYS, WEEKDAY_LABEL, teacherClashes, type TimetableSlot, type Weekday } from "@/apps/schoolmanagement/features/timetable/types"
import { cn } from "@/shared/lib/utils"

export function TimetableBoard({
  slots,
  className,
  section,
  canEdit,
  onMove,
  onRemove,
}: {
  slots: TimetableSlot[]
  className: string
  section: string
  canEdit: boolean
  onMove: (slotId: string, day: Weekday, period: number) => void
  onRemove: (slotId: string) => void
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))
  const [activeId, setActiveId] = useState<string | null>(null)
  const visible = slots.filter((slot) => slot.className === className && slot.section === section)
  const clashes = teacherClashes(slots).filter((clash) => clash.sections.includes(`${className}-${section}`))
  const clashKey = new Set(clashes.map((clash) => `${clash.teacherId}|${clash.day}|${clash.period}`))
  const active = slots.find((slot) => slot.id === activeId) ?? null

  function onDragEnd(event: DragEndEvent) {
    setActiveId(null)
    const overId = event.over ? String(event.over.id) : ""
    const [day, periodText] = overId.split(":")
    const period = Number(periodText)
    if (!canEdit || !day || !periodText || !(WEEKDAYS as readonly string[]).includes(day) || !period) return
    onMove(String(event.active.id), day as Weekday, period)
  }

  const grid = (
    <div className="overflow-x-auto">
      <div className="grid min-w-[52rem] gap-1" style={{ gridTemplateColumns: "4.5rem repeat(6, minmax(7rem, 1fr))" }}>
        <div />
        {WEEKDAYS.map((day) => (
          <div key={day} className="px-1 text-center text-xs font-medium text-muted-foreground">
            {WEEKDAY_LABEL[day]}
          </div>
        ))}
        {PERIODS.map((period) => (
          <PeriodRow
            key={period}
            period={period}
            visible={visible}
            canEdit={canEdit}
            clashKey={clashKey}
            onRemove={onRemove}
          />
        ))}
      </div>
    </div>
  )

  return (
    <div className="grid gap-3">
      {clashes.length > 0 ? (
        <div className="grid gap-1 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm">
          {clashes.map((clash) => (
            <p key={`${clash.teacherId}-${clash.day}-${clash.period}`}>
              {clash.teacherName} is also scheduled for {clash.sections.filter((item) => item !== `${className}-${section}`).join(", ")} on {WEEKDAY_LABEL[clash.day]}{" "}
              period {clash.period}.
            </p>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No teacher is booked twice in the same period.</p>
      )}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={(event) => setActiveId(String(event.active.id))} onDragCancel={() => setActiveId(null)} onDragEnd={onDragEnd}>
        {grid}
        <DragOverlay>{active ? <SlotFace slot={active} clash={false} /> : null}</DragOverlay>
      </DndContext>
    </div>
  )
}

function PeriodRow({
  period,
  visible,
  canEdit,
  clashKey,
  onRemove,
}: {
  period: number
  visible: TimetableSlot[]
  canEdit: boolean
  clashKey: Set<string>
  onRemove: (slotId: string) => void
}) {
  return (
    <>
      <div className="flex flex-col justify-center px-1 text-xs">
        <span className="font-medium">P{period}</span>
        <span className="text-muted-foreground">{PERIOD_TIME[period - 1]}</span>
      </div>
      {WEEKDAYS.map((day) => {
        const slot = visible.find((item) => item.day === day && item.period === period) ?? null
        return <PeriodCell key={`${day}-${period}`} day={day} period={period} slot={slot} canEdit={canEdit} clash={slot ? clashKey.has(`${slot.teacherId}|${slot.day}|${slot.period}`) : false} onRemove={onRemove} />
      })}
    </>
  )
}

function PeriodCell({
  day,
  period,
  slot,
  canEdit,
  clash,
  onRemove,
}: {
  day: Weekday
  period: number
  slot: TimetableSlot | null
  canEdit: boolean
  clash: boolean
  onRemove: (slotId: string) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `${day}:${period}`, disabled: !canEdit })
  return (
    <div ref={setNodeRef} className={cn("min-h-16 rounded-md border border-border bg-card p-1", isOver && "border-primary bg-accent")}>
      {slot ? <SlotCard slot={slot} clash={clash} canEdit={canEdit} onRemove={onRemove} /> : <span className="block px-1 py-2 text-xs text-muted-foreground">Free</span>}
    </div>
  )
}

function SlotCard({
  slot,
  clash,
  canEdit,
  onRemove,
}: {
  slot: TimetableSlot
  clash: boolean
  canEdit: boolean
  onRemove: (slotId: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: slot.id, disabled: !canEdit })
  return (
    <div ref={setNodeRef} className={cn("rounded-sm border border-border bg-background p-1.5 text-xs", clash && "border-amber-500", isDragging && "opacity-40")} style={{ transform: CSS.Translate.toString(transform) }}>
      <div className="flex items-start justify-between gap-1">
        <Button type="button" variant="ghost" className="h-auto min-w-0 flex-1 cursor-grab justify-start px-1 py-0 text-left" {...listeners} {...attributes}>
          <span className="block">
            <span className="block font-medium">{slot.subjectName}</span>
            <span className="block font-normal text-muted-foreground">{slot.teacherName}</span>
          </span>
        </Button>
        {canEdit ? (
          <Button type="button" variant="ghost" size="sm" className="h-6 px-1.5" onClick={() => onRemove(slot.id)}>
            Remove
          </Button>
        ) : null}
      </div>
    </div>
  )
}

function SlotFace({ slot, clash }: { slot: TimetableSlot; clash: boolean }) {
  return (
    <div className={cn("rounded-sm border border-border bg-background p-1.5 text-xs shadow-md", clash && "border-amber-500")}>
      <span className="block font-medium">{slot.subjectName}</span>
      <span className="block text-muted-foreground">{slot.teacherName}</span>
    </div>
  )
}
