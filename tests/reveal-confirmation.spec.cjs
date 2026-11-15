const { test, expect } = require("playwright/test");

for (const direction of ["forward", "reverse"]) {
  test(`reveal confirmation hides answer and respects cancellation (${direction})`, async ({ page }) => {
    await page.goto("?admin=sesamraeddel");
    const puzzle = await page.evaluate(() => window.RAEDDEL_PUZZLES[0]);
    await page.locator("#adminPuzzle").selectOption(puzzle.date);
    if (direction === "reverse") await page.locator("#directionBtn").click();
    const answer = direction === "forward" ? puzzle.steps[0].answer : puzzle.steps.at(-2).answer;
    const before = await page.locator("#trail").textContent();
    const expectedMessage = "Lösung wirklich aufdecken? Für diese Verbindung erhältst du 0 Punkte.";
    let message;
    page.once("dialog", async dialog => {
      message = dialog.message();
      await dialog.dismiss();
    });
    await page.locator("#revealBtn").click();
    expect(message).toBe(expectedMessage);
    expect(message.toLocaleUpperCase("de-DE")).not.toContain(answer);
    await expect(page.locator("#trail")).toHaveText(before);
    await expect(page.locator("#progressText")).toContainText("0 von");
    await expect(page.locator("#progressText")).toContainText("0 Punkte");
    await expect(page.locator(".clue.used")).toHaveCount(0);
    await page.locator("#guess").fill(answer);
    await page.locator("#guess").press("Enter");
    await expect(page.locator("#progressText")).toContainText("5 Punkte");
    page.once("dialog", async dialog => {
      message = dialog.message();
      await dialog.accept();
    });
    await page.locator("#revealBtn").click();
    expect(message).toBe(expectedMessage);
    await expect(page.locator("#progressText")).toContainText("2 von");
    await expect(page.locator("#progressText")).toContainText("5 Punkte");
    await expect(page.locator(".clue.used")).toHaveCount(2);
  });
}
