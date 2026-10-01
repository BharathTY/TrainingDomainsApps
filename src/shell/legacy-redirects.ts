const schoolModules = [
  "admissions",
  "students",
  "staff",
  "parents",
  "classes",
  "attendance",
  "timetable",
  "academics",
  "exams",
  "calendar",
  "fees",
  "library",
  "transport",
  "hostel",
  "certificates",
  "promotion",
  "communication",
  "visitors",
  "health",
  "reports",
  "settings",
]

export const LEGACY_REDIRECTS = [
  { from: "/login", to: "/schoolmanagement/login" },
  ...schoolModules.map((segment) => ({
    from: `/${segment}`,
    to: `/schoolmanagement/${segment}`,
  })),
]
