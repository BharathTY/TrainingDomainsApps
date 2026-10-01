import { Modal } from "@/shared/Modal"

export function OtpModal({ open, onClose, onSubmit }: { open: boolean; onClose: () => void; onSubmit: (code: string) => void }) {
  return (
    <Modal open={open} title="Enter the code" onClose={onClose}>
      <form
        data-testid="otp-modal"
        className="grid gap-3"
        onSubmit={(event) => {
          event.preventDefault()
          const data = new FormData(event.currentTarget)
          onSubmit(String(data.get("otp") ?? ""))
        }}
      >
        <label className="grid gap-1 text-sm" htmlFor="otp">
          One-time code
          <input id="otp" name="otp" inputMode="numeric" autoComplete="one-time-code" data-testid="otp-input" className="h-8 rounded-md border border-border px-2" />
        </label>
        <button type="submit" data-testid="otp-submit" className="h-8 rounded-md border border-border text-sm">
          Verify
        </button>
      </form>
    </Modal>
  )
}
