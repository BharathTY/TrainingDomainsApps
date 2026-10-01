export function formatInr(value: number) {
  if (value >= 100000) {
    const lakhs = value / 100000
    const digits = lakhs >= 10 ? 1 : 2
    const text = lakhs.toFixed(digits).replace(/\.0+$/, "")
    return `₹${text}L`
  }
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value)
}

export function percentOf(part: number, total: number) {
  if (total <= 0) return 0
  return Math.round((part / total) * 100)
}
