import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function DatePicker({
  id = "date",
  label,
  value,
  onChange,
}: {
  id?: string
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="grid gap-1.5" data-testid="date-picker">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} name={id} type="date" value={value} data-testid="date-picker-input" onChange={(event) => onChange(event.target.value)} />
    </div>
  )
}
