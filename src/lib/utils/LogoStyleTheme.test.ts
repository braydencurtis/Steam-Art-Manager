import type { LogoStyleDomSelectors, LogoStyleOverride } from "@types";
import { describe, expect, it } from "vitest";
import { compileLogoStyleTheme } from "./LogoStyleTheme";

const SHADOW_STYLE = "drop-shadow(0px 4px 30px rgba(0, 0, 0, 0.85))";

const SELECTORS: LogoStyleDomSelectors = {
  outerBoxSelector: "OUTER_CLASS",
  innerWrapperSelector: "INNER_CLASS",
};

describe("compileLogoStyleTheme", () => {
  it("always emits a :root block with the global shadow style", () => {
    const css = compileLogoStyleTheme({}, SHADOW_STYLE, SELECTORS);

    expect(css).toContain(":root");
    expect(css).toContain(`--logo-shadow: ${SHADOW_STYLE};`);
  });

  it("omits any appid with no override entirely", () => {
    const overrides: Record<string, LogoStyleOverride> = {
      "570": { shadow: false },
    };

    const css = compileLogoStyleTheme(overrides, SHADOW_STYLE, SELECTORS);

    expect(css).not.toContain("/570/");
  });

  it("emits a shadow-only rule for a game with shadow but no position", () => {
    const overrides: Record<string, LogoStyleOverride> = {
      "2909400": { shadow: true },
    };

    const css = compileLogoStyleTheme(overrides, SHADOW_STYLE, SELECTORS);

    expect(css).toContain("img[src*=\"/2909400/logo\"]");
    expect(css).toContain("filter: var(--logo-shadow) !important;");
    // No position was set, so no outer-box positioning rule should be emitted for this game.
    expect(css).not.toContain("div[class*=\"OUTER_CLASS\"]:has(img[src*=\"/2909400/logo\"])");
  });

  it("emits a position-only rule for a game with a position but no shadow", () => {
    const overrides: Record<string, LogoStyleOverride> = {
      "1091500": { shadow: false, position: { anchor: "TopLeft", offsetX: 0, offsetY: 0 } },
    };

    const css = compileLogoStyleTheme(overrides, SHADOW_STYLE, SELECTORS);

    expect(css).toContain("div[class*=\"OUTER_CLASS\"]:has(img[src*=\"/1091500/logo\"])");
    expect(css).toContain("div[class*=\"INNER_CLASS\"]");
    expect(css).toContain("top: 0% !important;");
    expect(css).toContain("left: 0% !important;");
    // No shadow was requested for this game.
    const gameSection = css.split("img[src*=\"/1091500/logo\"]")[2] ?? "";
    expect(gameSection).not.toContain("filter: var(--logo-shadow)");
  });

  it("emits both position and shadow rules for a game with both set", () => {
    const overrides: Record<string, LogoStyleOverride> = {
      "1462040": { shadow: true, position: { anchor: "CenterLeft", offsetX: 12, offsetY: -40 } },
    };

    const css = compileLogoStyleTheme(overrides, SHADOW_STYLE, SELECTORS);

    expect(css).toContain("div[class*=\"OUTER_CLASS\"]:has(img[src*=\"/1462040/logo\"])");
    expect(css).toContain("filter: var(--logo-shadow) !important;");
    expect(css).toContain("top: 50% !important;");
    expect(css).toContain("left: 0% !important;");
    expect(css).toContain("translate(0%, -50%) translate(12px, -40px)");
  });

  it("applies an unconstrained pixel offset even without a centered anchor", () => {
    const overrides: Record<string, LogoStyleOverride> = {
      "1": { shadow: false, position: { anchor: "TopLeft", offsetX: 400, offsetY: 250 } },
    };

    const css = compileLogoStyleTheme(overrides, SHADOW_STYLE, SELECTORS);

    expect(css).toContain("transform: translate(400px, 250px) !important;");
  });

  it("handles multiple games independently in one output", () => {
    const overrides: Record<string, LogoStyleOverride> = {
      "570": { shadow: true },
      "1091500": { shadow: false, position: { anchor: "BottomRight", offsetX: 0, offsetY: 0 } },
    };

    const css = compileLogoStyleTheme(overrides, SHADOW_STYLE, SELECTORS);

    expect(css).toContain("img[src*=\"/570/logo\"]");
    expect(css).toContain("img[src*=\"/1091500/logo\"]");
    expect(css).toContain("bottom: 0% !important;");
    expect(css).toContain("right: 0% !important;");
  });

  it("uses object-position and flex alignment matching each axis of the anchor", () => {
    const overrides: Record<string, LogoStyleOverride> = {
      "42": { shadow: false, position: { anchor: "BottomCenter", offsetX: 0, offsetY: 0 } },
    };

    const css = compileLogoStyleTheme(overrides, SHADOW_STYLE, SELECTORS);

    expect(css).toContain("object-position: center bottom !important;");
    expect(css).toContain("align-items: flex-end !important;");
    expect(css).toContain("justify-content: center !important;");
  });

  it("does not match a non-logo image sharing the same appid prefix, like a hero background", () => {
    // Steam serves other art (e.g. hero/background images) under the same
    // "/<appid>/" URL prefix as the logo, just with a different filename -
    // e.g. "/assets/1675830/hero.png" alongside "/assets/1675830/logo.png".
    // Every selector must require "logo" in the filename, or a positioning/shadow
    // rule meant for the logo will also apply to unrelated art for the same game.
    const overrides: Record<string, LogoStyleOverride> = {
      "1675830": { shadow: true, position: { anchor: "TopRight", offsetX: 0, offsetY: 0 } },
    };

    const css = compileLogoStyleTheme(overrides, SHADOW_STYLE, SELECTORS);

    expect(css).not.toContain("img[src*=\"/1675830/\"]:not([src*=\"logo\"])");
    // Every occurrence of the appid-scoped selector must be logo-specific.
    const matches = css.match(/img\[src\*="\/1675830\/[^"]*"\]/g) ?? [];
    expect(matches.length).toBeGreaterThan(0);
    for (const match of matches) {
      expect(match).toContain("logo");
    }
  });
});
