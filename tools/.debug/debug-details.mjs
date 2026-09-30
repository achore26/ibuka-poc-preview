import { chromium } from "@playwright/test";

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage();
await page.goto("http://127.0.0.1:55473/", { waitUntil: "networkidle" });
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(200);
const probe = async (label) => {
  const info = await page.evaluate(() => {
    const btn = [...document.querySelectorAll("button")].find((b) => b.textContent?.includes("Run connectivity check"));
    if (!btn) return null;
    const style = getComputedStyle(btn);
    const r = btn.getBoundingClientRect();
    const details = btn.closest("details");
    return {
      className: btn.className,
      computedHeight: style.height,
      rectHeight: Math.round(r.height),
      rectWidth: Math.round(r.width),
      checkVisibility: typeof btn.checkVisibility === "function" ? btn.checkVisibility() : null,
      offsetParent: btn.offsetParent ? btn.offsetParent.tagName : null,
      detailsOpen: details?.open ?? null,
    };
  });
  console.log(label, JSON.stringify(info));
};
await probe("closed:");
await page.getByText("Development diagnostics (staging team)", { exact: true }).click();
await page.waitForTimeout(200);
await probe("open:  ");
await browser.close();
