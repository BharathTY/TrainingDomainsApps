import type { ErrorRequestHandler } from "express"
import { ZodError } from "zod"

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof ZodError) {
    res.status(400).json({ message: error.issues[0]?.message ?? "Check the form" })
    return
  }
  console.error(error)
  res.status(500).json({ message: "Something went wrong" })
}
