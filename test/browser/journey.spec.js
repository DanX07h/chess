import { test, expect } from "@playwright/test";
test("first visit requests a username, then demo offers a complete navigable recap and gift", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "First, who’s at the board?" }),
  ).toBeVisible();
  await expect(page.getByLabel("Your username")).toBeVisible();
  await expect(page.locator(".sidebar")).toHaveCount(0);
  await page.getByLabel("Which chapter should we look at?").selectOption("all");
  await page.getByRole("button", { name: "Explore a sample recap" }).click();
  await expect(
    page.getByRole("heading", { name: "Your chess, replayed." }),
  ).toBeVisible({ timeout: 30000 });
  await page.getByRole("button", { name: "Next chapter" }).click();
  await expect(
    page.getByRole("heading", { name: "Every rating tells a story." }),
  ).toBeVisible();
  await expect(page.locator(".rewind-ratings")).toContainText("Rapid");
  await page
    .getByRole("button", { name: "Chapter 7: Let’s talk brilliant moves." })
    .click();
  await expect(
    page.getByRole("heading", { name: "Brilliant count: not available" }),
  ).toBeVisible();
  await expect(page.locator(".rewind-fact")).toContainText(
    "not automatically a brilliant move",
  );
  await page
    .getByRole("button", { name: "Chapter 11: Something for your next game." })
    .click();
  await page
    .getByRole("button", { name: "Unwrap my gift", exact: true })
    .click();
  await expect(page.locator(".rewind-gift-card")).toHaveCount(2);
  await expect(page.locator(".rewind-gifts")).toContainText("WHITE’S GIFT");
  await expect(page.locator(".rewind-gifts")).toContainText("BLACK’S GIFT");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Save your recap card" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/rewind\.svg$/);
  await page.getByRole("button", { name: "Enter your dashboard" }).click();
  await expect(
    page.getByRole("heading", { name: "Your game. A little clearer." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Replay recap" }).click();
  await expect(
    page.getByRole("heading", { name: "Your chess, replayed." }),
  ).toBeVisible();
});
test("calendar jumps several years back and offers importing older games", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Explore a sample recap" }).click();
  await page.getByRole("button", { name: "Skip to dashboard" }).click();
  await page.getByRole("button", { name: "Activity", exact: true }).click();
  await page.getByLabel("Calendar month").fill("2022-03");
  await expect(page.locator(".calendar-toolbar strong")).toHaveText(
    "March 2022",
  );
  await expect(page.locator(".calendar-day")).toHaveCount(31);
  await page.getByRole("button", { name: "Import older games" }).click();
  await page
    .getByLabel("Which chapter should we look at?")
    .selectOption("2022");
  await expect(page.getByLabel("Which chapter should we look at?")).toHaveValue(
    "2022",
  );
});
test("mobile welcome and every recap chapter fit the viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByLabel("Your username")).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await page.getByRole("button", { name: "Explore a sample recap" }).click();
  for (let i = 0; i < 11; i++) {
    await page.locator(".rewind-track button").nth(i).click();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(390);
    await expect(page.locator(".rewind-content h1")).toBeVisible();
  }
  await page
    .getByRole("button", { name: "Unwrap my gift", exact: true })
    .click();
  await expect(page.locator(".rewind-gift-card")).toHaveCount(2);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
});
