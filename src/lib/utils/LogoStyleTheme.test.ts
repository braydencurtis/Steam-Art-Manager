import type { LogoShadowStyle, LogoStyleDomSelectors, LogoStyleOverride } from "@types";
import { describe, expect, it } from "vitest";
import { compileLogoStyleTheme } from "./LogoStyleTheme";

const SHADOW_STYLE: LogoShadowStyle = {
  layer1: { radius: 30, opacity: 0.85 },
  layer2: { radius: 4, opacity: 0.6 },
};

const OTHER_SHADOW_STYLE: LogoShadowStyle = {
  layer1: { radius: 99, opacity: 0.12 },
  layer2: { radius: 7, opacity: 0.34 },
};

const SELECTORS: LogoStyleDomSelectors = {
  outerBoxSelector: "OUTER_CLASS",
  innerWrapperSelector: "INNER_CLASS",
};

describe("compileLogoStyleTheme", () => {
  it("emits nothing for an empty override map", () => {
    const css = compileLogoStyleTheme({}, SELECTORS);

    expect(css).toBe("");
  });

  it("omits any appid with no override entirely", () => {
    const overrides: Record<string, LogoStyleOverride> = {
      "570": {},
    };

    const css = compileLogoStyleTheme(overrides, SELECTORS);

    expect(css).not.toContain("/570/");
  });

  it("emits a shadow-only rule for a game with shadow but no position, built from that game's own structured shadow", () => {
    const overrides: Record<string, LogoStyleOverride> = {
      "2909400": { shadow: SHADOW_STYLE },
    };

    const css = compileLogoStyleTheme(overrides, SELECTORS);

    expect(css).toContain("img[src*=\"/2909400/logo\"]");
    expect(css).toContain("filter: drop-shadow(0px 4px 30px rgba(0, 0, 0, 0.85)) drop-shadow(0px 2px 4px rgba(0, 0, 0, 0.6)) !important;");
    // No position was set, so no outer-box positioning rule should be emitted for this game.
    expect(css).not.toContain("div[class*=\"OUTER_CLASS\"]:has(img[src*=\"/2909400/logo\"])");
  });

  it("reflects each game's own radius/opacity in its filter, with offset and color always fixed regardless of input", () => {
    const overrides: Record<string, LogoStyleOverride> = {
      "1": { shadow: OTHER_SHADOW_STYLE },
    };

    const css = compileLogoStyleTheme(overrides, SELECTORS);

    expect(css).toContain("drop-shadow(0px 4px 99px rgba(0, 0, 0, 0.12))");
    expect(css).toContain("drop-shadow(0px 2px 7px rgba(0, 0, 0, 0.34))");
  });

  it("lets two games diverge independently - each game's shadow is self-contained data, not a shared default", () => {
    const overrides: Record<string, LogoStyleOverride> = {
      "1": { shadow: SHADOW_STYLE },
      "2": { shadow: OTHER_SHADOW_STYLE },
    };

    const css = compileLogoStyleTheme(overrides, SELECTORS);

    expect(css).toContain("drop-shadow(0px 4px 30px rgba(0, 0, 0, 0.85)) drop-shadow(0px 2px 4px rgba(0, 0, 0, 0.6))");
    expect(css).toContain("drop-shadow(0px 4px 99px rgba(0, 0, 0, 0.12)) drop-shadow(0px 2px 7px rgba(0, 0, 0, 0.34))");
    // No shared CSS variable indirection - each game's filter is fully inline.
    expect(css).not.toContain("--logo-shadow");
    expect(css).not.toContain("var(--logo-shadow)");
  });

  it("emits a position-only rule for a game with a position but no shadow, using exact x/y values", () => {
    const overrides: Record<string, LogoStyleOverride> = {
      "1091500": { position: { x: 73, y: 12 } },
    };

    const css = compileLogoStyleTheme(overrides, SELECTORS);

    expect(css).toContain("div[class*=\"OUTER_CLASS\"]:has(img[src*=\"/1091500/logo\"])");
    expect(css).toContain("left: 73% !important;");
    expect(css).toContain("top: 12% !important;");
    expect(css).toContain("transform: translate(-73%, -12%) !important;");
    expect(css).toContain("object-position: 73% 12% !important;");
    // No shadow was requested for this game.
    const gameSection = css.split("img[src*=\"/1091500/logo\"]")[2] ?? "";
    expect(gameSection).not.toContain("filter:");
  });

  it("emits both position and shadow rules for a game with both set", () => {
    const overrides: Record<string, LogoStyleOverride> = {
      "1462040": { shadow: SHADOW_STYLE, position: { x: 0, y: 50 } },
    };

    const css = compileLogoStyleTheme(overrides, SELECTORS);

    expect(css).toContain("div[class*=\"OUTER_CLASS\"]:has(img[src*=\"/1462040/logo\"])");
    expect(css).toContain("filter: drop-shadow(0px 4px 30px rgba(0, 0, 0, 0.85)) drop-shadow(0px 2px 4px rgba(0, 0, 0, 0.6)) !important;");
    expect(css).toContain("left: 0% !important;");
    expect(css).toContain("top: 50% !important;");
    expect(css).toContain("transform: translate(0%, -50%) !important;");
  });

  it("handles multiple games independently in one output", () => {
    const overrides: Record<string, LogoStyleOverride> = {
      "570": { shadow: SHADOW_STYLE },
      "1091500": { position: { x: 100, y: 100 } },
    };

    const css = compileLogoStyleTheme(overrides, SELECTORS);

    expect(css).toContain("img[src*=\"/570/logo\"]");
    expect(css).toContain("img[src*=\"/1091500/logo\"]");
    expect(css).toContain("left: 100% !important;");
    expect(css).toContain("top: 100% !important;");
  });

  it("never emits inner-wrapper flex-alignment CSS anywhere in the output", () => {
    const overrides: Record<string, LogoStyleOverride> = {
      "42": { shadow: SHADOW_STYLE, position: { x: 50, y: 50 } },
    };

    const css = compileLogoStyleTheme(overrides, SELECTORS);

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
        "1": { position: { x, y } },
      };

      const css = compileLogoStyleTheme(overrides, SELECTORS);

      expect(css).toContain(`left: ${x}% !important;`);
      expect(css).toContain(`top: ${y}% !important;`);
      expect(css).not.toContain("right:");
      expect(css).not.toContain("bottom:");
    }
  });

  it("emits a background rule for a game with a background X override, matching both art sources", () => {
    const overrides: Record<string, LogoStyleOverride> = {
      "620": { background: { x: 25 } },
    };

    const css = compileLogoStyleTheme(overrides, SELECTORS);

    expect(css).toContain("img[src*=\"/customimages/620_hero.jpg\"]");
    expect(css).toContain("img[src*=\"/assets/620/library_hero.jpg\"]");
    expect(css).toContain("object-position: 25% 50% !important;");
  });

  it("does not match a game's blurred hero backdrop duplicates in its background rule", () => {
    // Steam renders 2 extra blurred copies of the hero image alongside the sharp
    // one for a backdrop effect - for Steam's default art these are <img> tags
    // with "_blur" inserted before the extension (e.g. "library_hero_blur.jpg"),
    // which must not match a selector meant only for the sharp "library_hero.jpg".
    const overrides: Record<string, LogoStyleOverride> = {
      "620": { background: { x: 25 } },
    };

    const css = compileLogoStyleTheme(overrides, SELECTORS);
    const backgroundSection = css.split("object-position")[0] ?? "";

    expect(backgroundSection).not.toContain("_blur");
  });

  it("keeps a game's logo and background rules independent when both are set", () => {
    const overrides: Record<string, LogoStyleOverride> = {
      "620": { position: { x: 0, y: 0 }, background: { x: 80 } },
    };

    const css = compileLogoStyleTheme(overrides, SELECTORS);

    expect(css).toContain("img[src*=\"/620/logo\"]");
    expect(css).toContain("img[src*=\"/customimages/620_hero.jpg\"]");
    expect(css).toContain("object-position: 0% 0% !important;");
    expect(css).toContain("object-position: 80% 50% !important;");
  });

  it("does not match a non-logo image sharing the same appid prefix, like a hero background", () => {
    // Steam serves other art (e.g. hero/background images) under the same
    // "/<appid>/" URL prefix as the logo, just with a different filename -
    // e.g. "/assets/1675830/hero.png" alongside "/assets/1675830/logo.png".
    // Every selector must require "logo" in the filename, or a positioning/shadow
    // rule meant for the logo will also apply to unrelated art for the same game.
    const overrides: Record<string, LogoStyleOverride> = {
      "1675830": { shadow: SHADOW_STYLE, position: { x: 100, y: 0 } },
    };

    const css = compileLogoStyleTheme(overrides, SELECTORS);

    const matches = css.match(/img\[src\*="\/1675830\/[^"]*"\]/g) ?? [];
    expect(matches.length).toBeGreaterThan(0);
    for (const match of matches) {
      expect(match).toContain("logo");
    }
  });
});
