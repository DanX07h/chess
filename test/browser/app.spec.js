import { test, expect } from "@playwright/test";
test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Explore a sample recap" }).click();
  await page.getByRole("button", { name: "Skip to dashboard" }).click();
  await expect(
    page.getByRole("heading", { name: "Your game. A little clearer." }),
  ).toBeVisible({ timeout: 45000 });
});
test("dashboard aggregates, format filters and date filters update together", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await expect(
    page.locator(".stat-card").nth(2).locator(".stat-value"),
  ).toHaveText("128");
  await expect(page.locator(".game-table tbody tr")).toHaveCount(5);
  await page.getByRole("button", { name: "Blitz", exact: true }).click();
  await expect(
    page.locator(".stat-card").nth(2).locator(".stat-value"),
  ).not.toHaveText("128");
  await expect(page.locator(".stat-label").first()).toContainText(
    "Blitz rating",
  );
  await page.getByLabel("Date range").selectOption("Last 7 days");
  const count = Number(
    await page.locator(".stat-card").nth(2).locator(".stat-value").innerText(),
  );
  expect(count).toBeLessThan(30);
  expect(errors).toEqual([]);
});
test("opening recommendations explain their evidence and results split by colour", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Openings", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Your style, in signals" }),
  ).toBeVisible();
  await page.locator(".opening-card").first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Why it’s on your list" }),
  ).toBeVisible();
  await page.getByLabel("Close dialog").click();
  await page.getByRole("button", { name: "♟ Black", exact: true }).click();
  await expect(page.locator(".opening-table tbody tr").first()).toContainText(
    "Italian Game",
  );
  await page.getByLabel("Minimum games per opening").selectOption("10");
  await expect(
    page.locator(".opening-table tbody tr").count(),
  ).resolves.toBeGreaterThan(0);
});
test("calendar days reveal real daily totals and month navigation works", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Activity", exact: true }).click();
  await page.locator(".calendar-day.has-games").first().click();
  await expect(page.locator(".day-detail")).toContainText("games");
  await expect(
    page.locator(".day-game-list > div").count(),
  ).resolves.toBeGreaterThan(0);
  const title = await page.locator(".calendar-toolbar strong").innerText();
  await page.getByLabel("Previous month").click();
  await expect(page.locator(".calendar-toolbar strong")).not.toHaveText(title);
  await expect(page.locator(".day-detail")).toHaveCount(0);
});
test("game search and result filter work together", async ({ page }) => {
  await page.getByRole("button", { name: "My games", exact: true }).click();
  await page.getByLabel("Search games").fill("rook_and_roll");
  const rows = page.locator(".game-table tbody tr");
  await expect(rows.first()).toContainText("rook_and_roll");
  await page.getByLabel("Filter game results").selectOption("win");
  const results = await page.locator(".result-badge").allTextContents();
  expect(results.length).toBeGreaterThan(0);
  expect(results.every((s) => s === "Win")).toBe(true);
  await page.getByLabel("Search games").fill("no-such-opponent-xyz");
  await expect(
    page.getByRole("heading", { name: "No games in this view" }),
  ).toBeVisible();
});
test("real engine review completes and board controls explore legal positions", async ({
  page,
  request,
}) => {
  await page
    .getByRole("button", { name: "Review game against quietstorm" })
    .click();
  const modal = page.getByRole("dialog");
  await expect(modal).toBeVisible();
  const initialBoard = await modal
    .locator(".chessboard")
    .getAttribute("aria-label");
  expect(initialBoard).toContain("White to move");
  await page.getByLabel("Next move", { exact: true }).click();
  await expect(modal.locator(".chessboard")).toHaveAttribute(
    "aria-label",
    /Black to move/,
  );
  await page.keyboard.press("ArrowRight");
  await expect(modal.locator(".board-controls")).toContainText("2 /");
  await expect(
    modal.getByText("Stockfish review", { exact: true }),
  ).toBeVisible({ timeout: 60000 });
  const response = await request.get("/api/datasets/demo");
  const data = await response.json();
  const reviewed = data.games.find((g) => g.id === "demo-0");
  expect(reviewed.analysis.complete).toBe(true);
  expect(reviewed.analysis.positions.length).toBeGreaterThan(20);
  await page.getByLabel("Final position").click();
  await expect(modal.locator(".board-controls")).toContainText(
    `${reviewed.moves.length} / ${reviewed.moves.length}`,
  );
  await page.keyboard.press("Escape");
  await expect(modal).toHaveCount(0);
});
test("connect account form submits the selected platform and loads its completed report", async ({
  page,
  request,
}) => {
  const fixture = await (await request.get("/api/datasets/demo")).json();
  fixture.id = "fixture-report";
  fixture.demo = false;
  fixture.profile = {
    username: "alice",
    platform: "lichess",
    url: "https://lichess.org/@/alice",
  };
  fixture.games = fixture.games.slice(0, 3);
  let submitted;
  let reportLoads = 0;
  await page.route("**/api/import", async (route) => {
    submitted = route.request().postDataJSON();
    await route.fulfill({
      status: 202,
      json: {
        id: "fixture-job",
        status: "running",
        progress: 10,
        message: "Importing…",
      },
    });
  });
  await page.route("**/api/jobs/fixture-job", (route) =>
    route.fulfill({
      json: {
        id: "fixture-job",
        status: "complete",
        datasetId: "fixture-report",
        progress: 100,
        message: "Your report is ready.",
      },
    }),
  );
  await page.route("**/api/datasets/fixture-report", (route) => {
    reportLoads++;
    return route.fulfill({ json: fixture });
  });
  await page
    .getByRole("button", { name: "Connect account", exact: true })
    .click();
  await page.getByRole("button", { name: "Lichess", exact: true }).click();
  await page.getByLabel("Your username").fill("alice");
  await page.getByRole("button", { name: "Find my chess story" }).click();
  await expect(
    page.getByRole("heading", { name: "Your chess, replayed." }),
  ).toBeVisible({
    timeout: 10000,
  });
  expect(reportLoads).toBe(1);
  expect(submitted).toEqual({
    platform: "lichess",
    username: "alice",
    history: "year",
  });
  await page.getByRole("button", { name: "Skip to dashboard" }).click();
  await expect(page.locator(".demo-banner")).toHaveCount(0);
  await expect(
    page.locator(".stat-card").nth(2).locator(".stat-value"),
  ).toHaveText("3");
  await page.reload();
  await page
    .getByRole("button", { name: "Continue alice’s dashboard" })
    .click();
  await expect(page.getByText("Welcome alice.")).toBeVisible();
});
test("training checklist persists and help can be dismissed with Escape", async ({
  page,
}) => {
  await page
    .getByRole("button", { name: "Training plan", exact: true })
    .click();
  await page.getByLabel("Complete Find one turning point").click();
  await expect(page.getByText("1 / 4 complete")).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Explore a sample recap" }).click();
  await page.getByRole("button", { name: "Skip to dashboard" }).click();
  await page
    .getByRole("button", { name: "Training plan", exact: true })
    .click();
  await expect(page.getByLabel("Unmark Find one turning point")).toBeVisible();
  await page.getByRole("button", { name: "How Knightly works" }).click();
  await expect(page.getByRole("dialog")).toContainText("What the numbers mean");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
test("API rejects invalid inputs and missing reports", async ({ request }) => {
  const invalid = await request.post("/api/import", {
    data: { platform: "chess.com", username: "../../private" },
  });
  expect(invalid.status()).toBe(400);
  const missing = await request.get("/api/datasets/not-valid");
  expect(missing.status()).toBe(404);
  expect((await (await request.get("/api/health")).json()).ok).toBe(true);
});
test("mobile navigation, layout and review board fit the viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(300);
  await expect(page.locator(".sidebar")).not.toBeInViewport();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await page.getByLabel("Open navigation").click();
  await page.getByRole("button", { name: "Activity", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Your chess calendar" }),
  ).toBeVisible();
  await expect(page.locator(".sidebar")).not.toBeInViewport();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await page.getByLabel("Open navigation").click();
  await page.getByRole("button", { name: "My games", exact: true }).click();
  await page
    .getByRole("button", { name: "Review game against quietstorm" })
    .first()
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  const board = await page.locator(".modal .chessboard").boundingBox();
  expect(board.width).toBeLessThan(390);
  expect(Math.abs(board.width - board.height)).toBeLessThan(2);
});
