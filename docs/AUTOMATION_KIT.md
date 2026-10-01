# Automation Practice Kit

Every app in this repo is a realistic business application and a Selenium/Playwright practice target. Students locate elements from simple to complex and handle calendars, tabs, frames, popups, dialogs, and authentication. Build production-quality screens. Every feature below is a hard requirement.

## Stack (already set up in this repo: reuse it, never re-scaffold)

- Frontend: React 18 + TypeScript (strict) + Vite + Tailwind CSS. Use hand-written semantic HTML components (no UI library that generates obscure markup), so the rendered DOM is clean and readable.
- Backend: Node.js + Express + Postgres database `trainingDomainApps`, REST API under /api, serving the built frontend.
- Seed data with @faker-js/faker (Indian names, INR currency, Indian cities/phone formats). 200+ rows per main entity.
- POST /api/reset restores the seed data; a "Reset demo data" button in Settings calls it. Tests must be repeatable.
- Multi-app repo: this app lives at its own base path (e.g. /crm) in the shared codebase. Every path in this prompt and the domain prompt (/login, /practice, /secure/*, /api/*, /frames/*) is relative to that base path, e.g. /crm/secure/admin and /api/crm/reset. Reuse components from src/shared; add new shared components there only if other apps can use them.
- Login: the base path itself is the login page (username + password, demo users per role shown on it). Session via the app's own HTTP-only cookie.

## 1. HTML standards and locator practice (simple to complex)

All markup must be valid HTML5 (passes the W3C validator) and WCAG 2.1 AA:

- Semantic landmarks: header, nav, main, aside, footer, section, article.
- One h1 per page, logical heading order.
- Every input has a `<label for>`, correct type (email, tel, number, date, time, datetime-local, month, week, password, search, url), name, autocomplete, required/min/max/pattern where relevant.
- Buttons are `<button type="button|submit|reset">`, links are `<a href>`. Never clickable divs, except in Level 4 below.
- Tables use caption, thead, tbody, tfoot, th scope.
- Include every standard form control somewhere: text, textarea, select (single + multiple), optgroup, datalist, radio group in fieldset/legend, checkbox group, range, color, file (single + multiple), progress, meter, details/summary.

Design locator difficulty in 4 levels, and document which screens are which on a /practice page:

- Level 1 (Beginner): stable id and name on forms (e.g. id="customer-firstName"), clear labels, link text.
- Level 2 (Intermediate): no ids; locate by class, CSS attribute selectors, data-testid on key actions, aria-label, placeholder, partial link text.
- Level 3 (Advanced): XPath-heavy - data tables with 20+ columns, row actions located via sibling/ancestor axes (e.g. the Edit button in the row whose Email is X), nested lists, duplicate button texts in different sections, text with extra whitespace.
- Level 4 (Expert): auto-generated dynamic ids (e.g. id="btn-7f3a9c" changing on each load), elements inside Shadow DOM (one web component), SVG icons/charts, hover-only menus, drag-and-drop (Kanban board), infinite scroll, lazy-loaded content with 1-3s random delay, a stale-element scenario (list re-renders after filter), disabled-then-enabled buttons, and one custom div-based dropdown.

## 2. Calendar and date-time

- Native: input type=date, time, datetime-local, month, week with min/max.
- Custom date picker component (month/year navigation, disabled past dates, disabled weekends where the domain needs it, range selection start-end).
- Full calendar screen (month / week / day views) showing domain events; click a slot to create, click an event to edit, drag to reschedule.
- Live clock in the top bar (IST), relative times ("5 minutes ago") with absolute time in a title attribute, and a date-range filter on every list screen.
- Store in UTC, display in Asia/Kolkata, format dd-MMM-yyyy and hh:mm a.

## 3. Multiple tabs

- In-page tabs: every detail page uses an ARIA tablist (role=tablist/tab/tabpanel, aria-selected, keyboard arrows). At least one tab set loads content lazily.
- Browser tabs/windows: links with target="_blank" (view invoice/report in new tab), a button that calls window.open() to open a new popup window of fixed size (e.g. print preview), and a flow where an action in the child window updates the parent (e.g. pick a record in the child window, value fills in the parent form).

## 4. Frames

- Single iframe: an embedded document viewer or help panel.
- Nested iframes: at least 3 levels deep (e.g. Reports > Chart frame > Filter frame), each with a form.
- An iframe with srcdoc, one with name only (no id), one with a dynamic id, and one that loads after a delay.
- A frame containing a form whose submit updates content in the parent page (postMessage).
- Static frame pages live in /public/frames. Do not use the obsolete `<frameset>`; iframes are the HTML5 standard.

## 5. Popups

- JavaScript alert (e.g. "Record saved"), confirm (delete), prompt (enter reason for cancellation) - all real window.alert/confirm/prompt, and the UI must react to accept vs dismiss.
- A window.open popup window (see section 3).
- Toast notifications that auto-dismiss after 5s.
- A session-timeout warning after 10 minutes of inactivity with a countdown and "Stay signed in".
- A cookie-consent banner on first visit, and a newsletter/offer popup that appears after 5s on the landing page.
- File upload (input type=file, and a drag-drop zone) and file download (CSV/PDF export).
- Browser print dialog via window.print() on printable views.

## 6. Dialogs

- Native `<dialog>` element with showModal() for at least one form.
- Custom modals with role="dialog", aria-modal="true", aria-labelledby, focus trap, Esc to close, click-outside to close (configurable).
- Confirmation dialog for every delete; a nested dialog (a dialog that opens a second dialog); a multi-step wizard inside a dialog; a side drawer for create/edit.
- beforeunload warning when leaving a form with unsaved changes.

## 7. Authentication popups

- /secure/* routes protected by HTTP Basic Auth on the Express server (use the basic-auth package; credentials admin / admin@123, documented on /practice). Accessing them triggers the browser's native auth popup. Include a secure admin page for the domain.
- A /secure/digest-like page that returns 401 on wrong credentials with a clear message.
- An in-app re-authentication modal (password confirmation) before sensitive actions.
- An OTP verification modal (fixed demo OTP 123456) with a 60s resend timer.

## CRUD standard for every entity

- List: search, column sorting, filters, date-range filter, pagination with page-size select, bulk select, bulk delete, CSV export.
- Create/Edit: form with validation messages beside each field (aria-describedby), success toast.
- View: detail page with tabs and an audit log.
- Delete: confirm dialog or JS confirm (mix both across entities), soft delete, restore from a Trash view.
- Loading skeleton, empty state, error state with retry on every list.

## Practice page

Build /practice listing every automation scenario in the app: a table with Feature, Screen (link), Locator level, and what the student should automate. Trainers use this as the exercise sheet.

## Quality

- Run tsc, ESLint and the W3C HTML validator (html-validate) in CI; zero errors.
- Write a README with setup, demo credentials, and the scenario list.
- Update the README URL table and this app's section of CLAUDE.md; never overwrite other apps' sections.
- Put any component another app could use in src/shared, not inside the app folder.

## Build phases

Build one app at a time after this kit is shared. `/schoolmanagement` is the reference implementation. The other apps stay `enabled: false` until their own phase starts. Each phase reuses `src/shared` and `server/shared`, then adds only domain screens, seed data, and that app's `/practice` rows.
