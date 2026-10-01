import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { App } from "@/App"
import "@/index.css"

async function prepare() {
  try {
    const { worker } = await import("@/apps/schoolmanagement/mocks/browser")
    await worker.start({ quiet: true })
  } catch {
    /* School data is mocked in the browser. Sign-in still uses the API server. */
  }
}

const root = document.getElementById("root")
if (!root) throw new Error("Root element missing")

void prepare().then(() => {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
