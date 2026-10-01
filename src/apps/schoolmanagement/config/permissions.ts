export const ROLES = ["admin", "teacher", "parent", "student"] as const
export type Role = (typeof ROLES)[number]

export const ACTIONS = ["view", "create", "edit", "delete", "export"] as const
export type Action = (typeof ACTIONS)[number]

export const MODULES = [
  { id: "dashboard", label: "Dashboard", path: "dashboard", group: "Overview", icon: "LayoutDashboard", description: "Role landing and today's school snapshot." },
  { id: "admissions", label: "Admissions", path: "admissions", group: "People", icon: "UserPlus", description: "Enquiries and new applications." },
  { id: "students", label: "Students", path: "students", group: "People", icon: "GraduationCap", description: "Student records for CBSE classes 1–12." },
  { id: "staff", label: "Staff", path: "staff", group: "People", icon: "Users", description: "Teachers and office staff." },
  { id: "parents", label: "Parents", path: "parents", group: "People", icon: "Contact", description: "Guardians linked to students." },
  { id: "classes", label: "Classes", path: "classes", group: "Academics", icon: "School", description: "Classes and sections A–D." },
  { id: "attendance", label: "Attendance", path: "attendance", group: "Academics", icon: "ClipboardCheck", description: "Daily attendance that stays usable on a phone." },
  { id: "timetable", label: "Timetable", path: "timetable", group: "Academics", icon: "CalendarClock", description: "Class and teacher timetables." },
  { id: "academics", label: "Academics", path: "academics", group: "Academics", icon: "BookOpen", description: "Subjects, homework, and lesson plans." },
  { id: "exams", label: "Exams", path: "exams", group: "Academics", icon: "FileCheck", description: "Assessments and marks entry." },
  { id: "calendar", label: "Calendar", path: "calendar", group: "Academics", icon: "Calendar", description: "Holidays, exams, and events." },
  { id: "fees", label: "Fees", path: "fees", group: "Operations", icon: "IndianRupee", description: "Fee dues and collections." },
  { id: "library", label: "Library", path: "library", group: "Operations", icon: "Library", description: "Books, issues, and returns." },
  { id: "transport", label: "Transport", path: "transport", group: "Operations", icon: "Bus", description: "Routes and student assignments." },
  { id: "hostel", label: "Hostel", path: "hostel", group: "Operations", icon: "Building2", description: "Rooms and allocations." },
  { id: "certificates", label: "Certificates", path: "certificates", group: "Operations", icon: "Award", description: "Transfer, bonafide, and character certificates." },
  { id: "promotion", label: "Promotion", path: "promotion", group: "Operations", icon: "ArrowUpRight", description: "Year-end promotion and detention." },
  { id: "communication", label: "Communication", path: "communication", group: "Office", icon: "Megaphone", description: "Notices and messages." },
  { id: "visitors", label: "Visitors", path: "visitors", group: "Office", icon: "DoorOpen", description: "Gate register." },
  { id: "health", label: "Health", path: "health", group: "Office", icon: "HeartPulse", description: "Infirmary visits and vaccinations." },
  { id: "reports", label: "Reports", path: "reports", group: "Office", icon: "ChartColumn", description: "Attendance, fees, and academic reports." },
  { id: "settings", label: "Settings", path: "settings", group: "System", icon: "Settings", description: "School profile and academic year." },
] as const

export type ModuleId = (typeof MODULES)[number]["id"]
export type AppModule = (typeof MODULES)[number]

const ALL: Action[] = ["view", "create", "edit", "delete", "export"]
const VIEW: Action[] = ["view"]

export const PERMISSIONS: Record<Role, Partial<Record<ModuleId, readonly Action[]>>> = {
  admin: Object.fromEntries(MODULES.map((module) => [module.id, ALL])) as Record<ModuleId, Action[]>,
  teacher: {
    dashboard: VIEW,
    students: VIEW,
    classes: VIEW,
    attendance: ["view", "create", "edit", "export"],
    timetable: VIEW,
    academics: ["view", "create", "edit"],
    exams: ["view", "create", "edit", "export"],
    calendar: VIEW,
    communication: ["view", "create"],
    health: ["view", "create"],
    reports: ["view", "export"],
  },
  parent: {
    dashboard: VIEW,
    students: VIEW,
    attendance: VIEW,
    exams: VIEW,
    fees: VIEW,
    calendar: VIEW,
    academics: VIEW,
    communication: ["view", "create"],
  },
  student: {
    dashboard: VIEW,
    attendance: VIEW,
    timetable: VIEW,
    academics: VIEW,
    exams: VIEW,
    library: VIEW,
    calendar: VIEW,
    communication: VIEW,
  },
}

let runtimeMatrix: typeof PERMISSIONS | null = null

export function applyPermissionMatrix(matrix: typeof PERMISSIONS | null) {
  runtimeMatrix = matrix
}

export function can(role: Role, moduleId: ModuleId, action: Action) {
  const table = runtimeMatrix ?? PERMISSIONS
  return table[role][moduleId]?.includes(action) ?? false
}

export function visibleModules(role: Role) {
  return MODULES.filter((module) => can(role, module.id, "view"))
}

export function moduleById(moduleId: ModuleId) {
  const found = MODULES.find((module) => module.id === moduleId)
  if (!found) throw new Error(`Unknown module ${moduleId}`)
  return found
}

export const ROLE_LABEL: Record<Role, string> = {
  admin: "Admin",
  teacher: "Teacher",
  parent: "Parent",
  student: "Student",
}
