import type { LogoPositionOverride, LogoShadowStyle, LogoStyleDomSelectors, LogoStyleOverride } from "@types";

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
    imgProps.push("  filter: var(--logo-shadow) !important;");
  }

  if (imgProps.length > 0) {
    blocks.push([`${imgSelector} {`, ...imgProps, "}"].join("\n"));
  }

  return blocks.join("\n\n");
}

/**
 * Compiles a per-game Logo Style Override map plus global settings into the complete
 * Theme CSS file contents. Pure - no filesystem access, no Tauri `invoke` calls.
 * @param overrides The per-appid Logo Style Overrides to compile.
 * @param globalShadowStyle The CSS `filter` value applied to every game with its shadow toggle on.
 * @param domSelectors The class-name fragments used to target Steam's CEF-rendered logo elements.
 * @returns The complete Theme CSS file contents.
 */
export function compileLogoStyleTheme(
  overrides: Record<string, LogoStyleOverride>,
  globalShadowStyle: LogoShadowStyle,
  domSelectors: LogoStyleDomSelectors
): string {
  const root = [
    ":root {",
    `  --logo-shadow: ${globalShadowStyle};`,
    "}",
  ].join("\n");

  const gameBlocks = Object.entries(overrides)
    .filter(([, override]) => override.shadow || override.position)
    .map(([appid, override]) => compileGameRules(appid, override, domSelectors))
    .filter((block) => block.length > 0);

  return [root, ...gameBlocks].join("\n\n");
}
