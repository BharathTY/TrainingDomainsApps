import { zodResolver } from "@hookform/resolvers/zod"
import { forwardRef, useState, type ComponentProps, type ReactNode } from "react"
import { useForm, useWatch } from "react-hook-form"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { admissionSchema, type AdmissionInput, type AdmissionValues } from "@/apps/schoolmanagement/features/students/schemas"
import { GENDERS, SECTIONS } from "@/apps/schoolmanagement/features/students/types"

const DRAFT_KEY = "sms-admission-draft"

const emptyAdmission: AdmissionInput = {
  firstName: "",
  lastName: "",
  gender: "",
  dateOfBirth: "",
  className: "6",
  section: "A",
  bloodGroup: "",
  fatherName: "",
  fatherPhone: "",
  motherName: "",
  motherPhone: "",
  guardianName: "",
  guardianPhone: "",
  address: "",
  previousSchool: "",
  board: "CBSE",
  lastClass: "",
  year: "",
  birthCertificate: false,
  photograph: false,
  transferCertificate: false,
}

const STEPS = [
  { id: "personal", label: "Personal", fields: ["firstName", "lastName", "gender", "dateOfBirth", "className", "section", "bloodGroup"] as const },
  { id: "parent", label: "Parent", fields: ["fatherName", "fatherPhone", "motherName", "motherPhone", "guardianName", "guardianPhone", "address"] as const },
  { id: "school", label: "Previous school", fields: ["previousSchool", "board", "lastClass", "year"] as const },
  { id: "documents", label: "Documents", fields: ["birthCertificate", "photograph", "transferCertificate"] as const },
  { id: "review", label: "Review", fields: [] as const },
]

const CLASS_OPTIONS = Array.from({ length: 12 }, (_, index) => String(index + 1))
const BOARDS = ["CBSE", "ICSE", "State", "Other"]

type Draft = { step: number; values: AdmissionInput; savedAt: string }

function readDraft(): Draft | null {
  const raw = localStorage.getItem(DRAFT_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Partial<Draft>
    if (!parsed.values || typeof parsed.step !== "number") return null
    return { step: parsed.step, values: { ...emptyAdmission, ...parsed.values }, savedAt: parsed.savedAt ?? "" }
  } catch {
    return null
  }
}

function writeDraft(step: number, values: AdmissionInput) {
  const savedAt = new Date().toISOString()
  localStorage.setItem(DRAFT_KEY, JSON.stringify({ step, values, savedAt }))
  return savedAt
}

export function AdmissionWizard({
  open,
  onOpenChange,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: AdmissionValues) => Promise<void>
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {open ? (
        <AdmissionForm onOpenChange={onOpenChange} onSubmit={onSubmit} />
      ) : (
        <SheetContent className="w-[min(100%,40rem)]">
          <SheetHeader>
            <SheetTitle>New admission</SheetTitle>
            <SheetDescription>Required fields are marked.</SheetDescription>
          </SheetHeader>
        </SheetContent>
      )}
    </Sheet>
  )
}

function AdmissionForm({
  onOpenChange,
  onSubmit,
}: {
  onOpenChange: (open: boolean) => void
  onSubmit: (values: AdmissionValues) => Promise<void>
}) {
  const draft = readDraft()
  const [step, setStep] = useState(() => (draft ? Math.min(draft.step, STEPS.length - 1) : 0))
  const [savedAt, setSavedAt] = useState<string | null>(draft?.savedAt || null)
  const form = useForm<AdmissionInput, unknown, AdmissionValues>({
    resolver: zodResolver(admissionSchema),
    defaultValues: draft?.values ?? emptyAdmission,
  })
  const values = useWatch({ control: form.control })
  const current = STEPS[step] ?? STEPS[0]

  async function goNext() {
    const fields = current?.fields ?? []
    if (fields.length > 0) {
      const valid = await form.trigger(fields)
      if (!valid) return
    }
    const next = Math.min(step + 1, STEPS.length - 1)
    setSavedAt(writeDraft(next, form.getValues()))
    setStep(next)
  }

  function saveDraft() {
    setSavedAt(writeDraft(step, form.getValues()))
    toast("Admission draft saved")
  }

  function discardDraft() {
    localStorage.removeItem(DRAFT_KEY)
    form.reset(emptyAdmission)
    setStep(0)
    setSavedAt(null)
  }

  return (
      <SheetContent className="w-[min(100%,40rem)]">
        <SheetHeader>
          <SheetTitle>New admission</SheetTitle>
          <SheetDescription>
            Step {step + 1} of {STEPS.length}: {current?.label}. Required fields are marked.
          </SheetDescription>
        </SheetHeader>
        <ol className="flex flex-wrap gap-1">
          {STEPS.map((item, index) => (
            <li key={item.id}>
              <Button type="button" size="sm" variant={index === step ? "secondary" : "ghost"} disabled={index > step} onClick={() => setStep(index)}>
                {index + 1}. {item.label}
              </Button>
            </li>
          ))}
        </ol>
        {savedAt ? <p className="text-xs text-muted-foreground">Draft saved {new Date(savedAt).toLocaleString()}</p> : null}
        <form
          className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto"
          onSubmit={form.handleSubmit(async (submitted) => {
            await onSubmit(submitted)
            localStorage.removeItem(DRAFT_KEY)
            onOpenChange(false)
          })}
        >
          {current?.id === "personal" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField label="First name" required error={form.formState.errors.firstName?.message} {...form.register("firstName")} />
              <TextField label="Last name" required error={form.formState.errors.lastName?.message} {...form.register("lastName")} />
              <SelectField label="Gender" required error={form.formState.errors.gender?.message} value={values.gender ?? ""} onChange={(value) => form.setValue("gender", value, { shouldValidate: true })} options={GENDERS.map((gender) => ({ label: gender[0]?.toUpperCase() + gender.slice(1), value: gender }))} />
              <TextField label="Date of birth" required type="date" error={form.formState.errors.dateOfBirth?.message} {...form.register("dateOfBirth")} />
              <SelectField label="Class" required error={form.formState.errors.className?.message} value={values.className ?? ""} onChange={(value) => form.setValue("className", value, { shouldValidate: true })} options={CLASS_OPTIONS.map((value) => ({ label: `Class ${value}`, value }))} />
              <SelectField label="Section" required error={form.formState.errors.section?.message} value={values.section ?? ""} onChange={(value) => form.setValue("section", value as AdmissionInput["section"], { shouldValidate: true })} options={SECTIONS.map((section) => ({ label: section, value: section }))} />
              <TextField label="Blood group" error={form.formState.errors.bloodGroup?.message} placeholder="O+" {...form.register("bloodGroup")} />
            </div>
          ) : null}
          {current?.id === "parent" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField label="Father's name" required error={form.formState.errors.fatherName?.message} {...form.register("fatherName")} />
              <TextField label="Father's mobile" type="tel" error={form.formState.errors.fatherPhone?.message} {...form.register("fatherPhone")} />
              <TextField label="Mother's name" required error={form.formState.errors.motherName?.message} {...form.register("motherName")} />
              <TextField label="Mother's mobile" type="tel" error={form.formState.errors.motherPhone?.message} {...form.register("motherPhone")} />
              <TextField label="Guardian" required error={form.formState.errors.guardianName?.message} {...form.register("guardianName")} />
              <TextField label="Guardian mobile" required type="tel" placeholder="98xxxxxxxx" error={form.formState.errors.guardianPhone?.message} {...form.register("guardianPhone")} />
              <div className="sm:col-span-2">
                <Field label="Address" required error={form.formState.errors.address?.message}>
                  <Textarea {...form.register("address")} />
                </Field>
              </div>
            </div>
          ) : null}
          {current?.id === "school" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField label="School name" required error={form.formState.errors.previousSchool?.message} {...form.register("previousSchool")} />
              <SelectField label="Board" required error={form.formState.errors.board?.message} value={values.board ?? ""} onChange={(value) => form.setValue("board", value, { shouldValidate: true })} options={BOARDS.map((board) => ({ label: board, value: board }))} />
              <TextField label="Last class" required error={form.formState.errors.lastClass?.message} {...form.register("lastClass")} />
              <TextField label="Year" required placeholder="2025" error={form.formState.errors.year?.message} {...form.register("year")} />
            </div>
          ) : null}
          {current?.id === "documents" ? (
            <div className="grid gap-3">
              <CheckField label="Birth certificate" required checked={Boolean(values.birthCertificate)} error={form.formState.errors.birthCertificate?.message} onChange={(checked) => form.setValue("birthCertificate", checked, { shouldValidate: true })} />
              <CheckField label="Photograph" required checked={Boolean(values.photograph)} error={form.formState.errors.photograph?.message} onChange={(checked) => form.setValue("photograph", checked, { shouldValidate: true })} />
              <CheckField label="Transfer certificate" checked={Boolean(values.transferCertificate)} onChange={(checked) => form.setValue("transferCertificate", checked)} />
            </div>
          ) : null}
          {current?.id === "review" ? <Review values={values} /> : null}
          <div className="mt-auto flex flex-wrap justify-between gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={discardDraft}>
              Discard draft
            </Button>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={saveDraft}>
                Save draft
              </Button>
              {step > 0 ? (
                <Button type="button" variant="outline" onClick={() => setStep((value) => value - 1)}>
                  Back
                </Button>
              ) : null}
              {step < STEPS.length - 1 ? (
                <Button type="button" onClick={() => void goNext()}>
                  Next
                </Button>
              ) : (
                <Button type="submit">Admit student</Button>
              )}
            </div>
          </div>
        </form>
      </SheetContent>
  )
}

function Review({ values }: { values: Partial<AdmissionInput> }) {
  const rows = [
    ["Name", `${values.firstName ?? ""} ${values.lastName ?? ""}`.trim()],
    ["Gender", values.gender || "—"],
    ["Date of birth", values.dateOfBirth || "—"],
    ["Class", values.className && values.section ? `${values.className}-${values.section}` : "—"],
    ["Father", values.fatherName || "—"],
    ["Mother", values.motherName || "—"],
    ["Guardian", `${values.guardianName ?? ""} · ${values.guardianPhone ?? ""}`],
    ["Address", values.address || "—"],
    ["Previous school", values.previousSchool || "—"],
    ["Board", `${values.board ?? ""} · class ${values.lastClass ?? ""} · ${values.year ?? ""}`],
    ["Birth certificate", values.birthCertificate ? "Received" : "Missing"],
    ["Photograph", values.photograph ? "Received" : "Missing"],
    ["Transfer certificate", values.transferCertificate ? "Received" : "Not attached"],
  ]
  return (
    <dl className="divide-y divide-border rounded-md border border-border">
      {rows.map(([label, value]) => (
        <div key={label} className="flex justify-between gap-4 px-3 py-2 text-sm">
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="text-right">{value}</dd>
        </div>
      ))}
    </dl>
  )
}

function Field({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label>
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </Label>
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  )
}

const TextField = forwardRef<HTMLInputElement, { label: string; required?: boolean; error?: string } & ComponentProps<typeof Input>>(function TextField(
  { label, required, error, ...props },
  ref,
) {
  return (
    <Field label={label} required={required} error={error}>
      <Input ref={ref} {...props} />
    </Field>
  )
})

function SelectField({
  label,
  required,
  error,
  value,
  onChange,
  options,
}: {
  label: string
  required?: boolean
  error?: string
  value: string
  onChange: (value: string) => void
  options: { label: string; value: string }[]
}) {
  return (
    <Field label={label} required={required} error={error}>
      <Select value={value || undefined} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder="Select" />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  )
}

function CheckField({
  label,
  required,
  checked,
  error,
  onChange,
}: {
  label: string
  required?: boolean
  checked: boolean
  error?: string
  onChange: (checked: boolean) => void
}) {
  return (
    <div className="grid gap-1.5">
      <Label className="flex items-center gap-2 font-normal">
        <Checkbox checked={checked} onCheckedChange={(value) => onChange(value === true)} />
        <span>
          {label}
          {required ? <span className="text-destructive"> *</span> : null}
        </span>
      </Label>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  )
}
