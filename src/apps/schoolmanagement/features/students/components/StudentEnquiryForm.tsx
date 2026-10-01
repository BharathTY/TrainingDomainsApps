import { useState, type FormEvent } from "react"
import { toast } from "sonner"
import { PhoneInput } from "@/shared/PhoneInput"
import { RepeatableGroup } from "@/shared/RepeatableGroup"
import { FieldError, FieldLabel, SelectField } from "@/shared/SelectField"
import type { Student } from "@/apps/schoolmanagement/features/students/types"

const TIMING = [
  { label: "Morning", value: "morning" },
  { label: "Afternoon", value: "afternoon" },
  { label: "Evening", value: "evening" },
]
const SLOTS = [
  { label: "Slot 1", value: "slot-1" },
  { label: "Slot 2", value: "slot-2" },
  { label: "Slot 3", value: "slot-3" },
]
const COURSES = [
  { label: "Mathematics", value: "mathematics" },
  { label: "Science", value: "science" },
  { label: "English", value: "english" },
]
const BRANCHES = [
  { label: "Main campus", value: "main" },
  { label: "North campus", value: "north" },
  { label: "South campus", value: "south" },
]
const CLASS_MODES = [
  { label: "Offline", value: "offline" },
  { label: "Online", value: "online" },
  { label: "Hybrid", value: "hybrid" },
]
const ENQUIRY_MODES = [
  { label: "Walk-in", value: "walk-in" },
  { label: "Phone", value: "phone" },
  { label: "Web", value: "web" },
]

function fieldValue(form: HTMLFormElement, name: string) {
  const field = form.elements.namedItem(name)
  if (field instanceof RadioNodeList || field instanceof HTMLInputElement || field instanceof HTMLSelectElement || field instanceof HTMLTextAreaElement) {
    return field.value.trim()
  }
  return ""
}

export function StudentEnquiryForm({ student }: { student: Student }) {
  const [courses, setCourses] = useState([{ id: "1" }])
  const [referrals, setReferrals] = useState([{ id: "1" }])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [courseSeq, setCourseSeq] = useState(1)
  const [referralSeq, setReferralSeq] = useState(1)

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const next: Record<string, string> = {}
    if (!fieldValue(form, "class-timing")) next["class-timing"] = "Select a class timing."
    courses.forEach((_, index) => {
      const n = index + 1
      if (!fieldValue(form, `course-${n}-course`)) next[`course-${n}-course`] = "Select a course."
      if (!fieldValue(form, `course-${n}-branches`)) next[`course-${n}-branches`] = "Select a branch."
      if (!fieldValue(form, `course-${n}-mode`)) next[`course-${n}-mode`] = "Select a mode of class."
      if (!fieldValue(form, `course-${n}-enquiry`)) next[`course-${n}-enquiry`] = "Select a mode of enquiry."
    })
    referrals.forEach((_, index) => {
      const n = index + 1
      if (!fieldValue(form, `referral-${n}-name`)) next[`referral-${n}-name`] = "Enter a referral name."
      const mobile = fieldValue(form, `referral-${n}-mobile`)
      if (!/^[0-9]{10}$/.test(mobile)) next[`referral-${n}-mobile`] = "Enter a 10-digit mobile number."
    })
    setErrors(next)
    if (Object.keys(next).length > 0) return
    toast("Enquiry saved")
  }

  return (
    <form id="student-enquiry" className="space-y-5" onSubmit={onSubmit} noValidate>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <SelectField id="class-timing" name="class-timing" label="Class Timing" required placeholder="Select Timing" options={TIMING} error={errors["class-timing"]} />
        <SelectField id="rigid-timing" name="rigid-timing" label="Rigid Timing" placeholder="Select Time Slots" options={SLOTS} />
      </div>
      <fieldset>
        <legend className="mb-2 text-[13px] font-medium">Course Enquiry Type</legend>
        <label className="inline-flex items-center gap-2 text-[13px]">
          <input
            type="radio"
            name="course-enquiry-type"
            value="regular"
            defaultChecked
            className="size-4 appearance-none rounded-full border border-primary bg-card checked:bg-primary checked:shadow-[inset_0_0_0_3px_white]"
          />
          Regular Course
        </label>
      </fieldset>
      <RepeatableGroup
        legend="Course"
        items={courses}
        onAdd={() => {
          const next = courseSeq + 1
          setCourseSeq(next)
          setCourses((current) => [...current, { id: String(next) }])
        }}
        onRemove={(id) => setCourses((current) => current.filter((item) => item.id !== id))}
      >
        {(_item, index) => {
          const n = index + 1
          return (
            <>
              <SelectField id={`course-${n}-course`} name={`course-${n}-course`} label="Course" required placeholder="Default Label" options={COURSES} error={errors[`course-${n}-course`]} />
              <SelectField id={`course-${n}-branches`} name={`course-${n}-branches`} label="Select Branches" required placeholder="Default Label" options={BRANCHES} error={errors[`course-${n}-branches`]} />
              <SelectField id={`course-${n}-mode`} name={`course-${n}-mode`} label="Mode of Class" required placeholder="Default Label" options={CLASS_MODES} error={errors[`course-${n}-mode`]} />
              <SelectField id={`course-${n}-enquiry`} name={`course-${n}-enquiry`} label="Mode of Enquiry" required placeholder="Default Label" options={ENQUIRY_MODES} error={errors[`course-${n}-enquiry`]} />
            </>
          )
        }}
      </RepeatableGroup>
      <h3 className="text-[14px] font-semibold">Referrals</h3>
      <RepeatableGroup
        legend="Referral"
        items={referrals}
        onAdd={() => {
          const next = referralSeq + 1
          setReferralSeq(next)
          setReferrals((current) => [...current, { id: String(next) }])
        }}
        onRemove={(id) => setReferrals((current) => current.filter((item) => item.id !== id))}
      >
        {(_item, index) => {
          const n = index + 1
          const nameId = `referral-${n}-name`
          const phoneId = `referral-${n}-mobile`
          return (
            <>
              <div>
                <FieldLabel htmlFor={nameId} required>
                  Name
                </FieldLabel>
                <input
                  id={nameId}
                  name={nameId}
                  defaultValue={n === 1 ? student.guardianName : ""}
                  placeholder="Referral Name"
                  aria-invalid={errors[nameId] ? true : undefined}
                  aria-describedby={errors[nameId] ? `${nameId}-error` : undefined}
                  className="h-10 w-full rounded-[6px] border border-input bg-card px-2.5 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <FieldError id={`${nameId}-error`} message={errors[nameId]} />
              </div>
              <PhoneInput
                id={phoneId}
                name={phoneId}
                label="Mobile Number"
                required
                defaultValue={n === 1 ? student.guardianPhone : ""}
                error={errors[phoneId]}
              />
            </>
          )
        }}
      </RepeatableGroup>
      <div>
        <h3 className="mb-2 text-[14px] font-semibold">
          <label htmlFor="comments">Comments</label>
        </h3>
        <textarea
          id="comments"
          name="comments"
          rows={4}
          placeholder="Enter Any Additional Comment"
          aria-describedby={errors.comments ? "comments-error" : undefined}
          className="min-h-24 w-full resize-y rounded-[6px] border border-input bg-card px-2.5 py-2 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <FieldError id="comments-error" message={errors.comments} />
      </div>
    </form>
  )
}
