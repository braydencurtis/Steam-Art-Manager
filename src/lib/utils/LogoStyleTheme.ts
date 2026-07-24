import type { LogoPositionOverride, LogoShadowStyle, LogoStyleDomSelectors, LogoStyleOverride } from "@types";

/**
 * Builds the CSS `filter` value for a shadow style - two stacked `drop-shadow()`
 * layers. Offset and color are fixed regardless of input; only radius and opacity
 * are ever configurable data.
 * @param shadow The shadow style to build a filter value for.
 */
function buildShadowFilter(shadow: LogoShadowStyle): string {
  const layer1 = `drop-shadow(0px 4px ${shadow.layer1.radius}px rgba(0, 0, 0, ${shadow.layer1.opacity}))`;
  const layer2 = `drop-shadow(0px 2px ${shadow.layer2.radius}px rgba(0, 0, 0, ${shadow.layer2.opacity}))`;
  return `${layer1} ${layer2}`;
}

/**
 * Builds the selector matching a game's hero image, across both art sources
 * Steam can serve it from - including the blurred backdrop duplicate Steam
 * renders alongside it, so the blur shifts in sync with the sharp image
 * instead of staying static. Only reachable for default Steam art, where the
 * blur duplicate is a real `<img>` with "_blur" inserted before ".jpg" - for
 * custom (SARM-managed) art the blur duplicates are `<canvas>` elements with
 * no `src` at all, and nothing else ties a given canvas to a specific game, so
 * there's no way to target one game's canvas duplicate with a CSS selector.
 * See docs/hero-background-dom-investigation.md for the DevTools findings
 * this is based on.
 * @param appid The game's Steam app ID.
 */
function buildHeroImageSelector(appid: string): string {
  return [
    `img[src*="/customimages/${appid}_hero.jpg"]`,
    `img[src*="/assets/${appid}/library_hero.jpg"]`,
    `img[src*="/assets/${appid}/library_hero_blur.jpg"]`,
  ].join(",\n");
}

function compileGameRules(appid: string, override: LogoStyleOverride, domSelectors: LogoStyleDomSelectors): string {
  // Steam serves other art (hero/background images, capsules, etc.) under the
  // same "/<appid>/" URL prefix as the logo, just with a different filename -
  // matching on the appid alone would also catch that unrelated art.
  const imgSelector = `img[src*="/${appid}/logo"]`;
  const outerSelector = `div[class*="${domSelectors.outerBoxSelector}"]:has(${imgSelector})`;

  const blocks: string[] = [];
  const imgProps: string[] = [];

  if (override.position) {
    const { x, y }: LogoPositionOverride = override.position;
    const negX = x === 0 ? "0" : `-${x}`;
    const negY = y === 0 ? "0" : `-${y}`;

    blocks.push([
      `${outerSelector} {`,
      `  left: ${x}% !important;`,
      `  top: ${y}% !important;`,
      `  transform: translate(${negX}%, ${negY}%) !important;`,
      "  margin: 0 !important;",
      "  padding: 0 !important;",
      "}",
    ].join("\n"));

    imgProps.push(`  object-position: ${x}% ${y}% !important;`, "  margin: 0 !important;");
  }

  if (override.shadow) {
    imgProps.push(`  filter: ${buildShadowFilter(override.shadow)} !important;`);
  }

  if (override.size) {
    imgProps.push(`  transform: scale(${override.size.scale / 100}) !important;`);
  }

  if (imgProps.length > 0) {
    blocks.push([`${imgSelector} {`, ...imgProps, "}"].join("\n"));
  }

  if (override.background) {
    // object-position's X is where the *image's* corresponding point lands in
    // the box, not a "pan the visible content" value - a lower X reveals the
    // image's left portion, which reads visually as the art having shifted
    // *right*. Inverting here keeps the stored/slider-facing x matching the
    // intuitive direction (drag left -> art visibly moves left).
    const objectPositionX = 100 - override.background.x;

    blocks.push([
      `${buildHeroImageSelector(appid)} {`,
      `  object-position: ${objectPositionX}% 50% !important;`,
      "}",
    ].join("\n"));
  }

  return blocks.join("\n\n");
}

/**
 * Compiles a per-game Logo Style Override map into the complete Theme CSS file
 * contents. Pure - no filesystem access, no Tauri `invoke` calls. Every per-game
 * shadow is fully self-contained data (a copy made when the game's shadow was
 * turned on), so there's no shared global CSS to emit here.
 * @param overrides The per-appid Logo Style Overrides to compile.
 * @param domSelectors The class-name fragments used to target Steam's CEF-rendered logo elements.
 * @returns The complete Theme CSS file contents.
 */
export function compileLogoStyleTheme(
  overrides: Record<string, LogoStyleOverride>,
  domSelectors: LogoStyleDomSelectors
): string {
  const gameBlocks = Object.entries(overrides)
    .filter(([, override]) => override.shadow || override.position || override.background || override.size)
    .map(([appid, override]) => compileGameRules(appid, override, domSelectors))
    .filter((block) => block.length > 0);

  return gameBlocks.join("\n\n");
}
