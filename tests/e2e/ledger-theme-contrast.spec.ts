import { expect, test } from "@playwright/test";

const stateClasses = [
  "table-chip-warning",
  "table-chip-lay-open",
  "table-chip-lay-partial",
  "table-chip-expiry-watch",
  "table-chip-info",
  "table-chip-lay-full",
  "table-chip-back-placed",
  "table-chip-status-placed",
  "table-chip-status-settled",
  "table-chip-status-awarded",
  "table-chip-strategy-underlay",
  "table-chip-strategy-overlay",
  "table-chip-strategy-standard",
  "table-chip-strategy-custom",
  "table-chip-strategy-no-lay",
  "table-chip-strategy-partial-lay",
  "table-chip-strategy-multilay",
  "table-chip-strategy-multilay-underlay",
  "calculator-match-rating-pill-low",
  "calculator-match-rating-pill-mid",
  "calculator-match-rating-pill-good",
  "calculator-match-rating-pill-arp",
];

test("ledger state pills retain AA text contrast in light and dark themes", async ({ page }) => {
  await page.goto("/login");

  for (const theme of ["light", "dark"] as const) {
    const ratios = await page.evaluate(
      ({ classes, activeTheme }) => {
        document.documentElement.dataset.theme = activeTheme;
        const host = document.createElement("div");
        host.style.cssText = "position:fixed;inset:0;z-index:99999;padding:16px;background:var(--bg)";
        document.body.append(host);

        const toRgb = (value: string) => {
          const rgbMatch = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
          if (rgbMatch) {
            return [Number(rgbMatch[1]), Number(rgbMatch[2]), Number(rgbMatch[3])];
          }
          const srgbMatch = value.match(/color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)/);
          if (srgbMatch) {
            return [Number(srgbMatch[1]) * 255, Number(srgbMatch[2]) * 255, Number(srgbMatch[3]) * 255];
          }
          throw new Error(`Unsupported computed colour: ${value}`);
        };
        const luminance = ([red, green, blue]: number[]) => {
          const linear = [red, green, blue].map((channel) => {
            const value = channel / 255;
            return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
          });
          return 0.2126 * linear[0]! + 0.7152 * linear[1]! + 0.0722 * linear[2]!;
        };

        return classes.map((className) => {
          const chip = document.createElement("span");
          chip.className = `table-chip ${className}`;
          chip.textContent = className;
          host.append(chip);
          const style = getComputedStyle(chip);
          const foreground = luminance(toRgb(style.color));
          const background = luminance(toRgb(style.backgroundColor));
          const ratio = (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05);
          return { className, ratio };
        });
      },
      { classes: stateClasses, activeTheme: theme }
    );

    for (const { className, ratio } of ratios) {
      expect(ratio, `${className} contrast in ${theme} mode`).toBeGreaterThanOrEqual(4.5);
    }
  }
});
