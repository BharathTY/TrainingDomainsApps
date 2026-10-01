import { setupWorker } from "msw/browser"
import { handlers } from "@/apps/schoolmanagement/mocks/handlers"

export const worker = setupWorker(...handlers)
