import { http, HttpResponse } from "msw"
import { gradeFor, percentOf, schemeError } from "@/apps/schoolmanagement/features/exams/grade"
import { examSchema, gradingSchema, markSchema, paperSchema } from "@/apps/schoolmanagement/features/exams/schemas"
import { SCHOOL_NAME, type ReportCard } from "@/apps/schoolmanagement/features/exams/types"
import { SECTIONS, type Section } from "@/apps/schoolmanagement/features/students/types"
import { db } from "@/apps/schoolmanagement/mocks/seed"

function isSection(value: string): value is Section {
  return (SECTIONS as readonly string[]).includes(value)
}

function findExam(id: string) {
  return db.exams.find((exam) => exam.id === id && !exam.deletedAt)
}

function roll(className: string, section: Section) {
  return db.students
    .filter((student) => !student.deletedAt && student.status === "active" && student.className === className && student.section === section)
    .sort((left, right) => `${left.firstName} ${left.lastName}`.localeCompare(`${right.firstName} ${right.lastName}`))
}

function linkedChild() {
  return db.students.find((student) => !student.deletedAt && student.status === "active" && student.className === "6" && student.section === "A") ?? null
}

function papersFor(examId: string) {
  return db.papers.filter((paper) => paper.examId === examId && !paper.deletedAt).sort((left, right) => left.date.localeCompare(right.date) || left.subjectName.localeCompare(right.subjectName))
}

function markFor(examId: string, paperId: string, studentId: string) {
  return db.marks.find((mark) => mark.examId === examId && mark.paperId === paperId && mark.studentId === studentId)
}

function cellGrade(score: number | null, max: number) {
  if (score == null) return { percent: null, grade: "" }
  const percent = percentOf(score, max)
  return { percent, grade: gradeFor(percent, db.bands) }
}

export const examHandlers = [
  http.get("/api/schoolmanagement/exams", () => HttpResponse.json(db.exams.filter((exam) => !exam.deletedAt))),
  http.post("/api/schoolmanagement/exams", async ({ request }) => {
    const parsed = examSchema.safeParse(await request.json())
    if (!parsed.success) return HttpResponse.json({ message: "Check the exam" }, { status: 400 })
    const exam = { id: crypto.randomUUID(), ...parsed.data, deletedAt: null }
    db.exams.unshift(exam)
    return HttpResponse.json(exam, { status: 201 })
  }),
  http.post("/api/schoolmanagement/exams/archive", async ({ request }) => {
    const body = (await request.json()) as { ids: string[] }
    const now = new Date().toISOString()
    for (const exam of db.exams) {
      if (body.ids.includes(exam.id)) exam.deletedAt = now
    }
    return HttpResponse.json({ ids: body.ids })
  }),
  http.post("/api/schoolmanagement/exams/restore", async ({ request }) => {
    const body = (await request.json()) as { ids: string[] }
    for (const exam of db.exams) {
      if (body.ids.includes(exam.id)) exam.deletedAt = null
    }
    return HttpResponse.json({ ids: body.ids })
  }),
  http.get("/api/schoolmanagement/grading", () => HttpResponse.json(db.bands)),
  http.put("/api/schoolmanagement/grading", async ({ request }) => {
    const parsed = gradingSchema.safeParse(await request.json())
    if (!parsed.success) return HttpResponse.json({ message: "Check the bands" }, { status: 400 })
    const problem = schemeError(parsed.data.bands)
    if (problem) return HttpResponse.json({ message: problem }, { status: 400 })
    db.bands = parsed.data.bands.map((band) => ({ id: crypto.randomUUID(), grade: band.grade, min: band.min, max: band.max }))
    return HttpResponse.json(db.bands)
  }),
  http.patch("/api/schoolmanagement/exams/:id", async ({ params, request }) => {
    const exam = findExam(String(params.id))
    if (!exam) return HttpResponse.json({ message: "Exam not found" }, { status: 404 })
    const parsed = examSchema.safeParse(await request.json())
    if (!parsed.success) return HttpResponse.json({ message: "Check the exam" }, { status: 400 })
    Object.assign(exam, parsed.data)
    return HttpResponse.json(exam)
  }),
  http.get("/api/schoolmanagement/exams/:id/papers", ({ params }) => {
    const exam = findExam(String(params.id))
    if (!exam) return HttpResponse.json({ message: "Exam not found" }, { status: 404 })
    return HttpResponse.json(papersFor(exam.id))
  }),
  http.post("/api/schoolmanagement/exams/:id/papers", async ({ params, request }) => {
    const exam = findExam(String(params.id))
    if (!exam) return HttpResponse.json({ message: "Exam not found" }, { status: 404 })
    const parsed = paperSchema.safeParse(await request.json())
    if (!parsed.success) return HttpResponse.json({ message: "Check the paper" }, { status: 400 })
    const subject = db.subjects.find((item) => item.id === parsed.data.subjectId && !item.deletedAt)
    if (!subject) return HttpResponse.json({ message: "Subject not found" }, { status: 404 })
    if (papersFor(exam.id).some((paper) => paper.subjectId === subject.id)) {
      return HttpResponse.json({ message: "That subject is already on this exam" }, { status: 409 })
    }
    const paper = {
      id: crypto.randomUUID(),
      examId: exam.id,
      subjectId: subject.id,
      subjectName: subject.name,
      date: parsed.data.date,
      startTime: parsed.data.startTime,
      durationMinutes: parsed.data.durationMinutes,
      maxMarks: parsed.data.maxMarks,
      deletedAt: null,
    }
    db.papers.push(paper)
    return HttpResponse.json(paper, { status: 201 })
  }),
  http.post("/api/schoolmanagement/exam-papers/archive", async ({ request }) => {
    const body = (await request.json()) as { ids: string[] }
    const now = new Date().toISOString()
    for (const paper of db.papers) {
      if (body.ids.includes(paper.id)) paper.deletedAt = now
    }
    return HttpResponse.json({ ids: body.ids })
  }),
  http.post("/api/schoolmanagement/exam-papers/restore", async ({ request }) => {
    const body = (await request.json()) as { ids: string[] }
    for (const paper of db.papers) {
      if (body.ids.includes(paper.id)) paper.deletedAt = null
    }
    return HttpResponse.json({ ids: body.ids })
  }),
  http.patch("/api/schoolmanagement/exam-papers/:id", async ({ params, request }) => {
    const paper = db.papers.find((item) => item.id === String(params.id) && !item.deletedAt)
    if (!paper) return HttpResponse.json({ message: "Paper not found" }, { status: 404 })
    const parsed = paperSchema.safeParse(await request.json())
    if (!parsed.success) return HttpResponse.json({ message: "Check the paper" }, { status: 400 })
    const subject = db.subjects.find((item) => item.id === parsed.data.subjectId && !item.deletedAt)
    if (!subject) return HttpResponse.json({ message: "Subject not found" }, { status: 404 })
    if (papersFor(paper.examId).some((item) => item.id !== paper.id && item.subjectId === subject.id)) {
      return HttpResponse.json({ message: "That subject is already on this exam" }, { status: 409 })
    }
    paper.subjectId = subject.id
    paper.subjectName = subject.name
    paper.date = parsed.data.date
    paper.startTime = parsed.data.startTime
    paper.durationMinutes = parsed.data.durationMinutes
    paper.maxMarks = parsed.data.maxMarks
    return HttpResponse.json(paper)
  }),
  http.get("/api/schoolmanagement/exams/:id/marks", ({ params, request }) => {
    const exam = findExam(String(params.id))
    if (!exam) return HttpResponse.json({ message: "Exam not found" }, { status: 404 })
    const section = new URL(request.url).searchParams.get("section") ?? ""
    if (!isSection(section)) return HttpResponse.json({ message: "Choose a section" }, { status: 400 })
    const papers = papersFor(exam.id)
    const rows = roll(exam.className, section).map((student) => ({
      studentId: student.id,
      name: `${student.firstName} ${student.lastName}`,
      admissionNo: student.admissionNo,
      cells: papers.map((paper) => {
        const score = markFor(exam.id, paper.id, student.id)?.score ?? null
        return { paperId: paper.id, score, grade: cellGrade(score, paper.maxMarks).grade }
      }),
    }))
    return HttpResponse.json({
      examId: exam.id,
      className: exam.className,
      section,
      papers: papers.map((paper) => ({ id: paper.id, subjectName: paper.subjectName, maxMarks: paper.maxMarks })),
      scheme: db.bands,
      rows,
    })
  }),
  http.patch("/api/schoolmanagement/exams/:id/marks", async ({ params, request }) => {
    const exam = findExam(String(params.id))
    if (!exam) return HttpResponse.json({ message: "Exam not found" }, { status: 404 })
    const parsed = markSchema.safeParse(await request.json())
    if (!parsed.success) return HttpResponse.json({ message: "Check the mark" }, { status: 400 })
    const paper = papersFor(exam.id).find((item) => item.id === parsed.data.paperId)
    if (!paper) return HttpResponse.json({ message: "Paper not found" }, { status: 404 })
    const student = db.students.find((item) => item.id === parsed.data.studentId && !item.deletedAt && item.status === "active" && item.className === exam.className)
    if (!student) return HttpResponse.json({ message: "Student is not on this class roll" }, { status: 400 })
    if (parsed.data.score != null && parsed.data.score > paper.maxMarks) {
      return HttpResponse.json({ message: `Marks cannot exceed ${paper.maxMarks}` }, { status: 400 })
    }
    let mark = markFor(exam.id, paper.id, student.id)
    if (!mark) {
      mark = { id: crypto.randomUUID(), examId: exam.id, paperId: paper.id, studentId: student.id, score: null }
      db.marks.push(mark)
    }
    mark.score = parsed.data.score
    const graded = cellGrade(mark.score, paper.maxMarks)
    return HttpResponse.json({ score: mark.score, percent: graded.percent, grade: graded.grade })
  }),
  http.get("/api/schoolmanagement/exams/:id/report", ({ params, request }) => {
    const exam = findExam(String(params.id))
    if (!exam) return HttpResponse.json({ message: "Exam not found" }, { status: 404 })
    const url = new URL(request.url)
    const role = url.searchParams.get("role")
    const studentId = url.searchParams.get("studentId")
    const student = role === "parent" || role === "student" ? linkedChild() : db.students.find((item) => item.id === studentId && !item.deletedAt)
    if (!student) return HttpResponse.json({ message: "Student not found" }, { status: 404 })
    if ((role === "parent" || role === "student") && student.className !== exam.className) {
      return HttpResponse.json({ message: "This exam is for another class" }, { status: 403 })
    }
    if (student.className !== exam.className) return HttpResponse.json({ message: "Student is not in this class" }, { status: 400 })
    const papers = papersFor(exam.id)
    let total = 0
    let totalMax = 0
    const rows = papers.map((paper) => {
      const score = markFor(exam.id, paper.id, student.id)?.score ?? null
      const graded = cellGrade(score, paper.maxMarks)
      if (score != null) {
        total += score
        totalMax += paper.maxMarks
      }
      return { subject: paper.subjectName, date: paper.date, score, max: paper.maxMarks, percent: graded.percent, grade: graded.grade || "—" }
    })
    const percent = totalMax === 0 ? null : percentOf(total, totalMax)
    const card: ReportCard = {
      school: SCHOOL_NAME,
      examId: exam.id,
      examName: exam.name,
      term: exam.term,
      studentId: student.id,
      name: `${student.firstName} ${student.lastName}`,
      admissionNo: student.admissionNo,
      className: student.className,
      section: student.section,
      rows,
      total,
      totalMax,
      percent,
      grade: percent == null ? "—" : gradeFor(percent, db.bands),
    }
    return HttpResponse.json(card)
  }),
]
