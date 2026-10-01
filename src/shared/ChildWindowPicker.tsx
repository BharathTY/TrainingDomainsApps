import { useEffect, useState } from "react"
import { Label } from "@/components/ui/label"
import { openAppPopup } from "@/shared/popup"

export const PICKER_MESSAGE = "practice-app-pick"

export type PickerPayload = {
  type: typeof PICKER_MESSAGE
  fieldId: string
  value: string
}

export function postPick(fieldId: string, value: string) {
  const payload: PickerPayload = { type: PICKER_MESSAGE, fieldId, value }
  window.opener?.postMessage(payload, window.location.origin)
  window.close()
}

export function ChildWindowPicker({
  id,
  label,
  popupPath,
  value,
  onPick,
}: {
  id: string
  label: string
  popupPath: string
  value: string
  onPick: (value: string) => void
}) {
  const [current, setCurrent] = useState(value)

  useEffect(() => {
    setCurrent(value)
  }, [value])

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return
      const data = event.data as Partial<PickerPayload>
      if (data?.type !== PICKER_MESSAGE || data.fieldId !== id || typeof data.value !== "string") return
      setCurrent(data.value)
      onPick(data.value)
    }
    window.addEventListener("message", onMessage)
    return () => window.removeEventListener("message", onMessage)
  }, [id, onPick])

  return (
    <div className="grid gap-1.5" data-testid="child-window-picker">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex gap-2">
        <input id={id} name={id} value={current} readOnly data-testid="child-window-value" className="h-8 flex-1 rounded-md border border-border px-2 text-sm" />
        <button
          type="button"
          data-testid="child-window-open"
          className="h-8 rounded-md border border-border px-3 text-sm"
          onClick={() => openAppPopup(popupPath, { name: `picker-${id}` })}
        >
          Choose
        </button>
      </div>
    </div>
  )
}
