const { test, expect } = require("playwright/test");
async function open(page, admin = false) {
  await page.clock.install({ time: new Date("2026-11-15T12:00:00Z") });
  await page.goto(admin ? "?admin=sesamraeddel" : "./");
  if (admin) {
    await page.locator("#adminPuzzle").selectOption("2026-11-14");
  } else {
    await page.locator("#archiveBtn").click();
    await page.locator('[data-date="2026-11-14"]').click();
  }
}
async function guess(page, word) {
  await page.locator("#guess").fill(word);
  await page.locator("#guessForm").press("Enter");
}
test("forward, manual final edge, persistence", async ({ page }) => {
  await open(page);
  for (const w of ["MAUS", "NAGER", "LAGER"]) await guess(page, w);
  await expect(page.locator("#finishArea")).toBeHidden();
  await guess(page, "ZELT");
  await expect(page.locator("#finishText")).toContainText("20 von 20");
  await page.reload();
  await page.locator("#archiveBtn").click();
  await page.locator('[data-date="2026-11-14"]').click();
  await expect(page.locator("#finishArea")).toBeVisible();
});
test("reverse", async ({ page }) => {
  await open(page);
  await page.locator("#directionBtn").click();
  for (const w of ["LAGER", "NAGER", "MAUS", "HAUS"]) await guess(page, w);
  await expect(page.locator("#finishText")).toContainText("20 von 20");
});
test("switch, tips, clue formatting and no active clue marker", async ({
  page,
}) => {
  await open(page);
  await expect(page.locator('.clue-insert').first()).toHaveCSS('color','rgb(23, 101, 179)');
  const texts = await page.locator(".clue-insert").allTextContents();
  expect(
    texts.every(
      (x) => x.replaceAll("„", "").replaceAll("“", "").toUpperCase() === "HAUS",
    ),
  ).toBeTruthy();
  await expect(page.locator(".clue.highlight")).toHaveCount(0);
  const order = await page.locator(".clue").allTextContents();
  await page.locator("#directionBtn").click();
  await page.locator("#directionBtn").click();
  expect(await page.locator(".clue").allTextContents()).toEqual(order);
  await page.locator("#tipBtn").click();
  await expect(page.locator(".clue.highlight")).toHaveCount(1);
  await guess(page, "MAUS");
  await guess(page, "NAGER");
  await page.locator("#directionBtn").click();
  await guess(page, "LAGER");
  await expect(page.locator(".clue.used")).toHaveCount(3);
  await expect(page.locator("#finishArea")).toBeHidden();
  await guess(page, "NAGER");
  await expect(page.locator("#finishText")).toContainText("17 von 20");
});
test("reveal scores zero and admin never writes storage", async ({ page }) => {
  await open(page, true);
  page.on("dialog", (d) => d.accept());
  await page.locator("#revealBtn").click();
  for (const w of ["NAGER", "LAGER", "ZELT"]) await guess(page, w);
  await expect(page.locator("#finishText")).toContainText("15 von 20");
  expect(await page.evaluate(() => localStorage.length)).toBe(0);
});
test("Berlin streak after midnight UTC difference", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-11-14T23:30:00Z") });
  await page.addInitScript(() =>
    localStorage.setItem(
      "raeddel-v2",
      JSON.stringify({
        schemaVersion: 2,
        records: {
          "2026-11-15": {
            step: 4,
            solvedEdges: [0, 1, 2, 3],
            finished: true,
            score: 20,
            scoreStatus: "v2",
            completedAt: "2026-11-14T23:15:00Z",
          },
        },
      }),
    ),
  );
  await page.goto("./");
  await page.locator("#statsBtn").click();
  await expect(page.locator(".stat strong")).toHaveText(["1", "1", "20"]);
});
for (const [time, date] of [
  ["2026-03-28T23:00:00Z", "2026-03-29"],
  ["2026-03-29T22:00:00Z", "2026-03-30"],
  ["2026-10-24T22:00:00Z", "2026-10-25"],
  ["2026-10-25T23:00:00Z", "2026-10-26"],
])
  test("Berlin boundary " + time, async ({ page }) => {
    await page.clock.install({ time: new Date(time) });
    await page.route('**/puzzles.js', async route => {
      const response=await route.fetch();
      const original=await response.text();
      await route.fulfill({response,body:original+`;window.RAEDDEL_PUZZLES = [ {...window.RAEDDEL_PUZZLES[0],date:'${date}',legacyId:99}, {...window.RAEDDEL_PUZZLES[1],date:'2099-01-01'} ];`});
    });
    await page.goto('./');
    await expect(page.locator('#puzzleTitle')).toHaveText('Räddel #99');

  });
test("midnight selects next puzzle", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-11-14T22:59:50Z") });
  await page.goto("./");
  await expect(page.locator("#puzzleTitle")).toHaveText("Räddel #1");
  await page.clock.fastForward(30000);
  await expect(page.locator("#puzzleTitle")).toHaveText("Räddel #2");
});
test("mobile and editor", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await open(page);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await page.goto("editor.html");
  await expect(page.locator("#steps .editstep")).toHaveCount(4);
});
test("puzzle data integrity", async ({ page }) => {
  await open(page);
  const data = await page.evaluate(() => window.RAEDDEL_PUZZLES);
  expect(data).toHaveLength(30);
  expect(new Set(data.map((p) => p.id)).size).toBe(30);
  for (const p of data) {
    expect(p.steps.at(-1).answer).toBe(p.end);
    for (const s of p.steps) {
      expect(s.clues.forward.split("_")).toHaveLength(2);
      expect(s.clues.reverse.split("_")).toHaveLength(2);
    }
  }
});

test('archive completion does not extend daily streak',async({page})=>{
  await open(page);
  for(const w of ['MAUS','NAGER','LAGER','ZELT']) await guess(page,w);
  await page.locator('#statsBtn').click();
  await expect(page.locator('.stat strong')).toHaveText(['1','0','20']);
});
test('admin preserves existing regular storage',async({page})=>{
  const existing=JSON.stringify({schemaVersion:2,records:{'2026-11-14':{step:1,solvedEdges:[0],score:5,scoreStatus:'v2'}}});
  await page.addInitScript(value=>localStorage.setItem('raeddel-v2',value),existing);
  await open(page,true);await guess(page,'MAUS');
  expect(await page.evaluate(()=>localStorage.getItem('raeddel-v2'))).toBe(existing);
});
