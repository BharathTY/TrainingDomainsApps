import { Modal } from "@/shared/Modal"

export function ReauthModal({ open, onClose, onSubmit }: { open: boolean; onClose: () => void; onSubmit: (password: string) => void }) {
  return (
    <Modal open={open} title="Confirm it is you" onClose={onClose}>
      <form
        data-testid="reauth-modal"
        className="grid gap-3"
        onSubmit={(event) => {
          event.preventDefault()
          const data = new FormData(event.currentTarget)
          onSubmit(String(data.get("password") ?? ""))
        }}
      >
        <label className="grid gap-1 text-sm" htmlFor="reauth-password">
          Password
          <input id="reauth-password" name="password" type="password" autoComplete="current-password" data-testid="reauth-password" className="h-8 rounded-md border border-border px-2" />
        </label>
        <button type="submit" data-testid="reauth-submit" className="h-8 rounded-md border border-border text-sm">
          Continue
        </button>
      </form>
    </Modal>
  )
}
