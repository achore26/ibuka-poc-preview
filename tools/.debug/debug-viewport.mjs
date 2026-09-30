import { chromium } from "@playwright/test";

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage();
await page.goto("http://127.0.0.1:55473/", { waitUntil: "networkidle" });
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(300);
const info = await page.evaluate(() => ({
  innerWidth: window.innerWidth,
  matchSm: window.matchMedia("(min-width: 40rem)").matches,
  matchSmPx: window.matchMedia("(min-width: 640px)").matches,
  inputHeight: Math.round(document.querySelector("#CP-01-text")?.getBoundingClientRect().height ?? -1),
  readyButton: Math.round(
    [...document.querySelectorAll("button")].find((b) => b.textContent?.trim() === "Ready for review")
      ?.getBoundingClientRect().height ?? -1,
  ),
  docScrollWidth: document.documentElement.scrollWidth,
}));
console.log(JSON.stringify(info, null, 2));
await browser.close();
