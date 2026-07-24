/**
 * A logo's position, as a continuous percentage (0-100) of Steam's logo bounding
 * box along each axis - e.g. x:0 is flush left, x:100 is flush right, x:50 is
 * centered. Deliberately separate from Steam's native `LogoPinPositions` (see
 * ADR-0001) - this vocabulary is not meant to be merged with it.
 */
export type LogoPositionOverride = {
  x: number,
  y: number,
};

/**
 * A background/hero image's horizontal position, as a continuous percentage (0-100).
 * X-only for now, per issue #12 - a Y axis may be added later if needed.
 */
export type LogoBackgroundOverride = {
  x: number,
};

/**
 * A per-game Logo Style Override. Shadow, position, and background are independent -
 * any combination, or (when absent from the overrides map) none, can be set for a game.
 */
export type LogoStyleOverride = {
  shadow: boolean,
  position?: LogoPositionOverride,
  background?: LogoBackgroundOverride,
};

/**
 * One `drop-shadow()` layer's tunable parameters. Offset and color are not
 * included here - they stay fixed at baked-in defaults (see `compileLogoStyleTheme`),
 * only radius and opacity (0-1) are ever user-configurable.
 */
export type LogoShadowLayer = {
  radius: number,
  opacity: number,
};

/**
 * The shadow applied to every game with its shadow toggle on - two stacked
 * `drop-shadow()` layers for visual depth.
 */
export type LogoShadowStyle = {
  layer1: LogoShadowLayer,
  layer2: LogoShadowLayer,
};

/**
 * The CSS class-name fragments used to target Steam's CEF-rendered logo elements.
 * Editable rather than hardcoded (see ADR-0002), since Steam's bundler regenerates
 * these hashes on client updates.
 */
export type LogoStyleDomSelectors = {
  outerBoxSelector: string,
  innerWrapperSelector: string,
};

/**
 * Defaults discovered via manual DevTools inspection, documented in
 * gemini-code-1784762951853.md, as of the time this feature was built.
 */
export const DEFAULT_LOGO_STYLE_DOM_SELECTORS: LogoStyleDomSelectors = {
  outerBoxSelector: "_2Eh7Soh97QONu_grMi2m66",
  innerWrapperSelector: "_2DVdg_N1qLNDdnxJqN-RBX",
};

export const DEFAULT_LOGO_SHADOW_STYLE: LogoShadowStyle = {
  layer1: { radius: 30, opacity: 0.85 },
  layer2: { radius: 4, opacity: 0.6 },
};
