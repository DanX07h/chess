import { test, expect } from "@playwright/test";
test("a completed import shows a report-load error and can open the report without importing again", async ({
  page,
  request,
}) => {
  const report = await (await request.get("/api/datasets/demo")).json();
  report.id = "recover-report";
  report.demo = false;
  report.profile = { username: "alice", platform: "lichess" };
  let reportLoads = 0,
    imports = 0;
  await page.route("**/api/import", (route) => {
    imports++;
    return route.fulfill({
      status: 202,
      json: {
        id: "recover-job",
        status: "running",
        progress: 5,
        message: "Importing games…",
      },
    });
  });
  await page.route("**/api/jobs/recover-job", (route) =>
    route.fulfill({
      json: {
        id: "recover-job",
        status: "complete",
        progress: 100,
        datasetId: report.id,
        message: "Your report is ready.",
      },
    }),
  );
  await page.route("**/api/datasets/recover-report", async (route) => {
    reportLoads++;
    if (reportLoads === 1) {
      await new Promise((r) => setTimeout(r, 250));
      return route.fulfill({
        status: 503,
        json: { error: "Report temporarily unavailable. Please retry." },
      });
    }
    return route.fulfill({ json: report });
  });
  await page.goto("/");
  await page.getByLabel("Your username").fill("alice");
  await page.getByRole("button", { name: "Find my chess story" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Report temporarily unavailable",
    { timeout: 10000 },
  );
  await page
    .getByRole("button", { name: "Open my report", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Your chess, replayed." }),
  ).toBeVisible();
  expect(imports).toBe(1);
  expect(reportLoads).toBe(2);
});
