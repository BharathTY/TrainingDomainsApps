import { toast } from "sonner"

export function showToast(message: string) {
  toast(message)
}

export function Toast({ message }: { message: string }) {
  return (
    <div role="status" data-testid="toast" className="rounded-md border border-border bg-background px-3 py-2 text-sm">
      {message}
    </div>
  )
}
