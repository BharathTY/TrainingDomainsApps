import type { ReportCard } from "@/apps/schoolmanagement/features/exams/types"

export async function downloadReportPdf(card: ReportCard) {
  const { jsPDF } = await import("jspdf")
  const doc = new jsPDF({ unit: "mm", format: "a4" })
  const left = 16
  let y = 18
  doc.setFont("helvetica", "bold")
  doc.setFontSize(16)
  doc.text(card.school, left, y)
  y += 7
  doc.setFontSize(12)
  doc.text("Report card", left, y)
  y += 6
  doc.setFont("helvetica", "normal")
  doc.setFontSize(10)
  doc.text(`${card.examName} · ${card.term}`, left, y)
  y += 5
  doc.text(`${card.name} · ${card.admissionNo}`, left, y)
  y += 5
  doc.text(`Class ${card.className}-${card.section}`, left, y)
  y += 8
  const columns = [left, 78, 108, 128, 148, 168]
  doc.setFont("helvetica", "bold")
  ;["Subject", "Date", "Marks", "Max", "%", "Grade"].forEach((label, index) => {
    doc.text(label, columns[index] ?? left, y)
  })
  y += 2
  doc.line(left, y, 194, y)
  y += 6
  doc.setFont("helvetica", "normal")
  for (const row of card.rows) {
    const values = [row.subject, row.date, row.score == null ? "—" : String(row.score), String(row.max), row.percent == null ? "—" : String(row.percent), row.grade]
    values.forEach((value, index) => {
      doc.text(value, columns[index] ?? left, y)
    })
    y += 6
  }
  y += 2
  doc.line(left, y, 194, y)
  y += 6
  doc.setFont("helvetica", "bold")
  doc.text("Total", columns[0] ?? left, y)
  doc.text(String(card.total), columns[2] ?? left, y)
  doc.text(String(card.totalMax), columns[3] ?? left, y)
  doc.text(card.percent == null ? "—" : String(card.percent), columns[4] ?? left, y)
  doc.text(card.grade, columns[5] ?? left, y)
  const file = `${card.admissionNo}-${card.examName}`.toLowerCase().replace(/[^a-z0-9]+/g, "-")
  doc.save(`${file}.pdf`)
}
