import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { csvStudentSchema, type CsvStudent } from "@/apps/schoolmanagement/features/students/schemas"
import { downloadCsv, parseCsv } from "@/shared/lib/csv"

const TEMPLATE = [
  ["firstName", "lastName", "gender", "class", "section", "guardianName", "guardianPhone"],
  ["Asha", "Rao", "female", "6", "A", "Meera Rao", "9876543210"],
]

const HEADER_MAP: Record<string, keyof CsvStudent> = {
  firstname: "firstName",
  lastname: "lastName",
  gender: "gender",
  class: "className",
  classname: "className",
  section: "section",
  guardianname: "guardianName",
  guardian: "guardianName",
  guardianphone: "guardianPhone",
  phone: "guardianPhone",
  mobile: "guardianPhone",
}

type PreviewRow = { line: number; name: string; valid: boolean; message: string; value?: CsvStudent }

function previewCsv(raw: string): { error: string | null; rows: PreviewRow[] } {
  const table = parseCsv(raw)
  const header = table[0]
  if (!header || header.length === 0) return { error: null, rows: [] }
  const keys = header.map((cell) => HEADER_MAP[cell.toLowerCase().replaceAll(" ", "")])
  const required: (keyof CsvStudent)[] = ["firstName", "lastName", "gender", "className", "section", "guardianName", "guardianPhone"]
  const missing = required.filter((key) => !keys.includes(key))
  if (missing.length > 0) return { error: `Missing columns: ${missing.join(", ")}`, rows: [] }
  const rows = table.slice(1).map((cells, index) => {
    const record: Record<string, string> = {}
    keys.forEach((key, cellIndex) => {
      if (key) record[key] = cells[cellIndex] ?? ""
    })
    const parsed = csvStudentSchema.safeParse(record)
    if (parsed.success) {
      return { line: index + 2, name: `${parsed.data.firstName} ${parsed.data.lastName}`, valid: true, message: "Ready to import", value: parsed.data }
    }
    return {
      line: index + 2,
      name: `${record.firstName ?? ""} ${record.lastName ?? ""}`.trim() || `Row ${index + 2}`,
      valid: false,
      message: parsed.error.issues.map((issue) => issue.message).join(" "),
    }
  })
  return { error: null, rows }
}

export function ImportStudentsDialog({
  open,
  onOpenChange,
  onImport,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImport: (rows: CsvStudent[]) => Promise<void>
}) {
  const [raw, setRaw] = useState("")
  const [busy, setBusy] = useState(false)
  const preview = useMemo(() => previewCsv(raw), [raw])
  const valid = preview.rows.filter((row) => row.value).map((row) => row.value).filter((row): row is CsvStudent => Boolean(row))

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setRaw("")
        onOpenChange(next)
      }}
    >
      <DialogContent className="w-[min(100%-2rem,44rem)]">
        <DialogHeader>
          <DialogTitle>Import students</DialogTitle>
          <DialogDescription>Upload or paste a CSV. Invalid rows stay out of the register.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="flex flex-wrap items-end gap-2">
            <div className="grid flex-1 gap-1.5">
              <Label htmlFor="student-csv">CSV file</Label>
              <Input
                id="student-csv"
                type="file"
                accept=".csv,text/csv"
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (!file) return
                  void file.text().then(setRaw)
                }}
              />
            </div>
            <Button type="button" variant="outline" onClick={() => downloadCsv("students-template.csv", TEMPLATE)}>
              Template
            </Button>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="student-csv-paste">Or paste CSV</Label>
            <Textarea id="student-csv-paste" value={raw} onChange={(event) => setRaw(event.target.value)} placeholder="firstName,lastName,gender,class,section,guardianName,guardianPhone" />
          </div>
          {preview.error ? <p className="text-sm text-destructive">{preview.error}</p> : null}
          {preview.rows.length > 0 ? (
            <div className="max-h-64 overflow-auto rounded-md border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Row</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Result</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.rows.map((row) => (
                    <TableRow key={row.line}>
                      <TableCell>{row.line}</TableCell>
                      <TableCell>{row.name}</TableCell>
                      <TableCell className={row.valid ? undefined : "text-destructive"}>{row.message}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={valid.length === 0 || busy}
              onClick={() => {
                setBusy(true)
                void onImport(valid)
                  .then(() => {
                    setRaw("")
                    onOpenChange(false)
                  })
                  .finally(() => setBusy(false))
              }}
            >
              Import {valid.length} valid
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
