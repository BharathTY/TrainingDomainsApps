export const WO_TRANSITIONS: Record<string, string[]> = {
  open: ["scheduled", "in_progress", "on_hold", "closed"],
  scheduled: ["in_progress", "on_hold", "closed"],
  in_progress: ["on_hold", "completed", "closed"],
  on_hold: ["scheduled", "in_progress", "closed"],
  completed: ["closed"],
  closed: [],
}
