import { Modal } from "@/shared/Modal"

export function SessionTimeout({ open, onContinue, onSignOut }: { open: boolean; onContinue: () => void; onSignOut: () => void }) {
  return (
    <Modal open={open} title="Session timing out" onClose={onContinue}>
      <div data-testid="session-timeout" className="grid gap-3">
        <p>Your session is about to end.</p>
        <div className="flex gap-2">
          <button type="button" data-testid="session-timeout-continue" className="h-8 rounded-md border border-border px-3 text-sm" onClick={onContinue}>
            Stay signed in
          </button>
          <button type="button" data-testid="session-timeout-signout" className="h-8 rounded-md border border-border px-3 text-sm" onClick={onSignOut}>
            Sign out
          </button>
        </div>
      </div>
    </Modal>
  )
}
