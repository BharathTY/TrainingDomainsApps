const IST = "Asia/Kolkata"

export function formatIstDate(value: Date | string | number) {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: IST,
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value))
}

export function formatIstDateTime(value: Date | string | number) {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: IST,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value))
}

export function todayIst() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: IST }).format(new Date())
}
