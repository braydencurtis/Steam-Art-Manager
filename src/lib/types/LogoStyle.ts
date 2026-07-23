/**
 * The 9-point grid a Logo Style Override's position is anchored to.
 * Deliberately separate from Steam's native `LogoPinPositions` (see ADR-0001) -
 * this vocabulary is not meant to be merged with it.
 */
export type AnchorPosition =
  | "TopLeft" | "TopCenter" | "TopRight"
  | "CenterLeft" | "CenterCenter" | "CenterRight"
  | "BottomLeft" | "BottomCenter" | "BottomRight";

/**
 * An anchor plus an unconstrained pixel nudge from that anchor.
 */
export type LogoPositionOverride = {
  anchor: AnchorPosition,
  offsetX: number,
  offsetY: number,
};

/**
 * A per-game Logo Style Override. Shadow and position are independent -
 * either, both, or (when absent from the overrides map) neither can be set for a game.
 */
export type LogoStyleOverride = {
  shadow: boolean,
  position?: LogoPositionOverride,
};

/**
 * The CSS `filter` value applied to every game with its shadow toggle on.
 */
export type LogoShadowStyle = string;

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

export const DEFAULT_LOGO_SHADOW_STYLE: LogoShadowStyle = "drop-shadow(0px 4px 30px rgba(0, 0, 0, 0.85)) drop-shadow(0px 2px 4px rgba(0, 0, 0, 0.6))";
