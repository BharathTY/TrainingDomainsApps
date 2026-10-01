import { Label } from "@/components/ui/label"

export function FileUpload({
  id = "file",
  label,
  onSelect,
}: {
  id?: string
  label: string
  onSelect: (file: File | null) => void
}) {
  return (
    <div className="grid gap-1.5" data-testid="file-upload">
      <Label htmlFor={id}>{label}</Label>
      <input
        id={id}
        name={id}
        type="file"
        data-testid="file-upload-input"
        className="text-sm"
        onChange={(event) => onSelect(event.target.files?.[0] ?? null)}
      />
    </div>
  )
}
