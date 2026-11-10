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
 * Steam can serve it from. Deliberately matches on extension-less path
 * fragments only - a game's hero art can be served as .jpg, .png, or other
 * formats depending on what the source image actually was (confirmed:
 * roughly half a real library's grid folder is .png, not .jpg), so requiring
 * a specific extension silently breaks for every game whose art isn't that
 * one format. Naturally also matches the blurred backdrop duplicate Steam
 * renders alongside the default-art sharp image (a real `<img>` with "_blur"
 * inserted before the extension), which is intentional - the blur shifts in
 * sync with the sharp image instead of staying static. Custom (SARM-managed)
 * art's blur duplicates are `<canvas>` elements with no `src` at all, and
 * nothing else ties a given canvas to a specific game, so there's no way to
 * target one game's canvas duplicate with a CSS selector - already excluded
 * for free by scoping to `img`.
 * See docs/hero-background-dom-investigation.md for the DevTools findings
 * this is based on.
 * @param appid The game's Steam app ID.
 */
function buildHeroImageSelector(appid: string): string {
  return [
    `img[src*="/customimages/${appid}_hero"]`,
    `img[src*="/assets/${appid}/library_hero"]`,
  ].join(",\n");
}

/**
 * Builds the selector matching a game's logo image, across both art sources
 * Steam can serve it from - Steam's own default logo art uses "/<appid>/logo"
 * in its path, but a SARM-managed custom logo (set via the normal grid
 * management feature, independent of Logo Style Override) is served from
 * "/customimages/<appid>_logo" instead - an underscore, not the slash the
 * default-art pattern relies on, so it never matched the old single-pattern
 * selector. Confirmed via DevTools inspection of a game with a custom logo set.
 * @param appid The game's Steam app ID.
 */
function buildLogoImageSelector(appid: string): string {
  return [
    `img[src*="/customimages/${appid}_logo"]`,
    `img[src*="/${appid}/logo"]`,
  ].join(",\n");
}

function compileGameRules(appid: string, override: LogoStyleOverride, domSelectors: LogoStyleDomSelectors): string {
  const imgSelector = buildLogoImageSelector(appid);
  const outerSelector = `div[class*="${domSelectors.outerBoxSelector}"]:has(${imgSelector})`;

  const blocks: string[] = [];
  const imgProps: string[] = [];
  // Position and size both drive `transform` on the img, so they accumulate here
  // and are emitted as one declaration - a second `transform` would overwrite the first.
  const imgTransforms: string[] = [];

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

    // Anchoring the outer box is necessary but not sufficient. Confirmed against
    // the live Steam DOM (CDP, Big Picture): the img is `position: absolute` at
    // `left: 0` inside a wrapper far wider than it (648px wrapper, 406px logo),
    // and its own box is already exactly logo-sized - height comes from the
    // wrapper, width from the intrinsic aspect ratio. So the box travelled to the
    // requested anchor and the logo stayed pinned to the box's left edge, short by
    // the 242px of slack inside: x=100 nowhere near the right edge, x=50 left of
    // centre. Giving the img the same left/translate pair makes the two compose to
    // `logoLeft = x% * (containerWidth - logoWidth)`, i.e. flush left at 0, truly
    // centred at 50, flush right at 100. Verified at x = 0/25/50/75/100.
    // `right: auto` guards the pair against a theme that insets the img on both edges.
    imgProps.push(`  left: ${x}% !important;`, "  right: auto !important;");
    imgTransforms.push(`translateX(${negX}%)`);

    // Kept, though it is inert in the DOM shape observed: `object-fit: contain` has
    // no letterboxing slack when the img box already matches the logo's aspect.
    imgProps.push(`  object-position: ${x}% ${y}% !important;`, "  margin: 0 !important;");
  }

  if (override.shadow) {
    imgProps.push(`  filter: ${buildShadowFilter(override.shadow)} !important;`);
  }

  if (override.size) {
    // transform: scale() shrinks/grows from transform-origin, which defaults to
    // the element's center - combined with a corner-anchored position, that
    // leaves a gap between the anchor and the now-smaller logo, and no amount
    // of repositioning can close it since the origin never moves with it.
    // Anchoring the origin to the same point as the position (or center, if no
    // position is set) makes the logo scale from - and stay flush with -
    // wherever it's actually anchored.
    const originX = override.position?.x ?? 50;
    const originY = override.position?.y ?? 50;

    imgProps.push(`  transform-origin: ${originX}% ${originY}% !important;`);
    imgTransforms.push(`scale(${override.size.scale / 100})`);
  }

  if (imgTransforms.length > 0) {
    imgProps.push(`  transform: ${imgTransforms.join(" ")} !important;`);
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
