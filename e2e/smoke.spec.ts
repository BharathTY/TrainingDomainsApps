import { expect, test } from "@playwright/test"

const apps = ["schoolmanagement", "crm", "erp", "retail", "ecommerce", "assets", "hospital", "banking", "inventory"]

test("every app base path shows its login page", async ({ page }) => {
  for (const id of apps) {
    await page.goto(`/${id}`)
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible()
    await expect(page.getByTestId("login-form")).toBeVisible()
  }
})

test("school management signs in and protects the secure area", async ({ page, request }) => {
  await page.goto("/schoolmanagement")
  await page.getByTestId("demo-account-admin").click()
  await page.getByTestId("login-submit").click()
  await expect(page).toHaveURL(/\/schoolmanagement\/dashboard$/)
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible()

  const secure = await request.get("/schoolmanagement/secure/admin")
  expect(secure.status()).toBe(401)
})
