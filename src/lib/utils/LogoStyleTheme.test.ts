import type { LogoShadowStyle, LogoStyleDomSelectors, LogoStyleOverride } from "@types";
import { describe, expect, it } from "vitest";
import { compileLogoStyleTheme } from "./LogoStyleTheme";

const SHADOW_STYLE: LogoShadowStyle = {
  layer1: { radius: 30, opacity: 0.85 },
  layer2: { radius: 4, opacity: 0.6 },
};

const SELECTORS: LogoStyleDomSelectors = {
  outerBoxSelector: "OUTER_CLASS",
  innerWrapperSelector: "INNER_CLASS",
};

describe("compileLogoStyleTheme", () => {
  it("always emits a :root block with the global shadow style built from structured radius/opacity", () => {
    const css = compileLogoStyleTheme({}, SHADOW_STYLE, SELECTORS);

    expect(css).toContain(":root");
    expect(css).toContain("--logo-shadow: drop-shadow(0px 4px 30px rgba(0, 0, 0, 0.85)) drop-shadow(0px 2px 4px rgba(0, 0, 0, 0.6));");
  });

  it("reflects radius/opacity inputs in the built filter, with offset and color always fixed regardless of input", () => {
    const customShadow: LogoShadowStyle = {
      layer1: { radius: 99, opacity: 0.12 },
      layer2: { radius: 7, opacity: 0.34 },
    };

    const css = compileLogoStyleTheme({}, customShadow, SELECTORS);

    // Radius/opacity flow through from input.
    expect(css).toContain("99px rgba(0, 0, 0, 0.12)");
    expect(css).toContain("7px rgba(0, 0, 0, 0.34)");
    // Offset and color stay fixed regardless of input.
    expect(css).toContain("drop-shadow(0px 4px 99px rgba(0, 0, 0, 0.12))");
    expect(css).toContain("drop-shadow(0px 2px 7px rgba(0, 0, 0, 0.34))");
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

  it("emits a position-only rule for a game with a position but no shadow, using exact x/y values", () => {
    const overrides: Record<string, LogoStyleOverride> = {
      "1091500": { shadow: false, position: { x: 73, y: 12 } },
    };

    const css = compileLogoStyleTheme(overrides, SHADOW_STYLE, SELECTORS);

    expect(css).toContain("div[class*=\"OUTER_CLASS\"]:has(img[src*=\"/1091500/logo\"])");
    expect(css).toContain("left: 73% !important;");
    expect(css).toContain("top: 12% !important;");
    expect(css).toContain("transform: translate(-73%, -12%) !important;");
    expect(css).toContain("object-position: 73% 12% !important;");
    // No shadow was requested for this game.
    const gameSection = css.split("img[src*=\"/1091500/logo\"]")[2] ?? "";
    expect(gameSection).not.toContain("filter: var(--logo-shadow)");
  });

  it("emits both position and shadow rules for a game with both set", () => {
    const overrides: Record<string, LogoStyleOverride> = {
      "1462040": { shadow: true, position: { x: 0, y: 50 } },
    };

    const css = compileLogoStyleTheme(overrides, SHADOW_STYLE, SELECTORS);

    expect(css).toContain("div[class*=\"OUTER_CLASS\"]:has(img[src*=\"/1462040/logo\"])");
    expect(css).toContain("filter: var(--logo-shadow) !important;");
    expect(css).toContain("left: 0% !important;");
    expect(css).toContain("top: 50% !important;");
    expect(css).toContain("transform: translate(0%, -50%) !important;");
  });

  it("handles multiple games independently in one output", () => {
    const overrides: Record<string, LogoStyleOverride> = {
      "570": { shadow: true },
      "1091500": { shadow: false, position: { x: 100, y: 100 } },
    };

    const css = compileLogoStyleTheme(overrides, SHADOW_STYLE, SELECTORS);

    expect(css).toContain("img[src*=\"/570/logo\"]");
    expect(css).toContain("img[src*=\"/1091500/logo\"]");
    expect(css).toContain("left: 100% !important;");
    expect(css).toContain("top: 100% !important;");
  });

  it("never emits inner-wrapper flex-alignment CSS anywhere in the output", () => {
    const overrides: Record<string, LogoStyleOverride> = {
      "42": { shadow: true, position: { x: 50, y: 50 } },
    };

    const css = compileLogoStyleTheme(overrides, SHADOW_STYLE, SELECTORS);

    expect(css).not.toContain("INNER_CLASS");
    expect(css).not.toContain("align-items");
    expect(css).not.toContain("justify-content");
    expect(css).not.toContain("display: flex");
  });

  it("reproduces every old 9-point anchor position as an x/y special case", () => {
    const corners = [
      { x: 0, y: 0 }, { x: 50, y: 0 }, { x: 100, y: 0 },
      { x: 0, y: 50 }, { x: 50, y: 50 }, { x: 100, y: 50 },
      { x: 0, y: 100 }, { x: 50, y: 100 }, { x: 100, y: 100 },
    ];

    for (const { x, y } of corners) {
      const overrides: Record<string, LogoStyleOverride> = {
        "1": { shadow: false, position: { x, y } },
      };

      const css = compileLogoStyleTheme(overrides, SHADOW_STYLE, SELECTORS);

      expect(css).toContain(`left: ${x}% !important;`);
      expect(css).toContain(`top: ${y}% !important;`);
      expect(css).not.toContain("right:");
      expect(css).not.toContain("bottom:");
    }
  });

  it("emits no CSS for a game with only a background override set (no CSS generation yet - plumbing only)", () => {
    const overrides: Record<string, LogoStyleOverride> = {
      "620": { shadow: false, background: { x: 25 } },
    };

    const css = compileLogoStyleTheme(overrides, SHADOW_STYLE, SELECTORS);

    expect(css).not.toContain("/620/");
  });

  it("does not match a non-logo image sharing the same appid prefix, like a hero background", () => {
    // Steam serves other art (e.g. hero/background images) under the same
    // "/<appid>/" URL prefix as the logo, just with a different filename -
    // e.g. "/assets/1675830/hero.png" alongside "/assets/1675830/logo.png".
    // Every selector must require "logo" in the filename, or a positioning/shadow
    // rule meant for the logo will also apply to unrelated art for the same game.
    const overrides: Record<string, LogoStyleOverride> = {
      "1675830": { shadow: true, position: { x: 100, y: 0 } },
    };

    const css = compileLogoStyleTheme(overrides, SHADOW_STYLE, SELECTORS);

    const matches = css.match(/img\[src\*="\/1675830\/[^"]*"\]/g) ?? [];
    expect(matches.length).toBeGreaterThan(0);
    for (const match of matches) {
      expect(match).toContain("logo");
    }
  });
});
