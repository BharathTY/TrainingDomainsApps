import { FieldError, FieldLabel } from "@/shared/SelectField"

const COUNTRIES = [
  { code: "IN", dial: "+91", flag: "🇮🇳", label: "India" },
  { code: "US", dial: "+1", flag: "🇺🇸", label: "United States" },
  { code: "GB", dial: "+44", flag: "🇬🇧", label: "United Kingdom" },
  { code: "AE", dial: "+971", flag: "🇦🇪", label: "United Arab Emirates" },
]

export function PhoneInput({
  id,
  name,
  label,
  placeholder = "Enter Mobile Number",
  defaultValue = "",
  error,
  required,
}: {
  id: string
  name: string
  label?: string
  placeholder?: string
  defaultValue?: string
  error?: string
  required?: boolean
}) {
  const errorId = `${id}-error`
  return (
    <div>
      {label ? (
        <FieldLabel htmlFor={id} required={required}>
          {label}
        </FieldLabel>
      ) : null}
      <div className="flex h-10 overflow-hidden rounded-[6px] border border-input bg-card focus-within:ring-2 focus-within:ring-ring">
        <label className="sr-only" htmlFor={`${id}-country`}>
          Country
        </label>
        <select
          id={`${id}-country`}
          name={`${name}-country`}
          defaultValue="IN"
          aria-label="Country"
          className="h-full appearance-none border-0 bg-card bg-[length:12px] bg-[position:right_6px_center] bg-no-repeat pl-2 pr-5 text-[13px] outline-none"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%235c5c66' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
          }}
        >
          {COUNTRIES.map((country) => (
            <option key={country.code} value={country.code}>
              {country.flag} {country.dial}
            </option>
          ))}
        </select>
        <input
          id={id}
          name={name}
          type="tel"
          inputMode="numeric"
          placeholder={placeholder}
          defaultValue={defaultValue.replace(/\D/g, "").slice(-10)}
          pattern="[0-9]{10}"
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className="h-full min-w-0 flex-1 border-0 bg-card px-2 text-[13px] outline-none"
        />
      </div>
      <FieldError id={errorId} message={error} />
    </div>
  )
}
