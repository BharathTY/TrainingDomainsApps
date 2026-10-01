import type { ReactNode, SelectHTMLAttributes } from "react"
import { cn } from "@/shared/lib/utils"

export function FieldLabel({
  htmlFor,
  required,
  children,
}: {
  htmlFor: string
  required?: boolean
  children: ReactNode
}) {
  return (
    <label htmlFor={htmlFor} className="mb-1 block text-[13px] font-medium text-foreground">
      {required ? <span>* </span> : null}
      {children}
    </label>
  )
}

export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null
  return (
    <p id={id} className="mt-1 text-[12px] text-destructive" role="alert">
      {message}
    </p>
  )
}

const fieldClass =
  "h-10 w-full appearance-none rounded-[6px] border border-input bg-card bg-[length:16px] bg-[position:right_10px_center] bg-no-repeat px-2.5 pr-8 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-ring"

export function SelectField({
  id,
  label,
  required,
  placeholder,
  options,
  error,
  className,
  ...props
}: Omit<SelectHTMLAttributes<HTMLSelectElement>, "id"> & {
  id: string
  label: string
  placeholder: string
  options: { label: string; value: string }[]
  error?: string
}) {
  const errorId = `${id}-error`
  return (
    <div className={className}>
      <FieldLabel htmlFor={id} required={required}>
        {label}
      </FieldLabel>
      <div className="relative">
        <select
          id={id}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={cn(fieldClass)}
          defaultValue=""
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%235c5c66' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
          }}
          {...props}
        >
          <option value="" disabled>
            {placeholder}
          </option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      <FieldError id={errorId} message={error} />
    </div>
  )
}
