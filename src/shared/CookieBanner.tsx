export function CookieBanner({ onAccept }: { onAccept: () => void }) {
  return (
    <div data-testid="cookie-banner" className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-3 border-t border-border bg-background px-4 py-3 text-sm">
      <p>This practice site stores a session cookie for the app you sign in to.</p>
      <button type="button" data-testid="cookie-banner-accept" className="h-8 rounded-md border border-border px-3" onClick={onAccept}>
        OK
      </button>
    </div>
  )
}
