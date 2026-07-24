# Hero/Background Image DOM Investigation

Manual DevTools investigation of Steam Big Picture Mode's hero/background image element, following the same `chrome://inspect` workflow used to discover the logo's selectors (see `gemini-code-1784762951853.md`). Findings as of 2026-07-23, for issue #10, to seed default DOM Selector values for the background CSS generation work (issue #14).

## Element structure

```html
<div class="QlR9EFwTdUNm_J5vx54_Z">
  <img class="HNbe3eZf6H7dtJ042x1vM" src="...">
</div>
```

- **Tag**: `<img>`, not a `background-image`-styled `<div>` (unlike what was assumed possible in the original plan). Horizontal position should therefore use `object-position`, the same mechanism as the logo - **not** `background-position-x`.
- **Outer container class**: `QlR9EFwTdUNm_J5vx54_Z`
- **Image class**: `HNbe3eZf6H7dtJ042x1vM`

These classes were confirmed identical across two different games (one with SARM-managed custom art, one with Steam's default art), so they appear to be a structural/layout class, not per-game or per-art-source.

## Per-game targeting: two different `src` shapes

Unlike the logo (always `/<appid>/logo...`, one consistent shape), the hero image's `src` differs depending on whether the game has custom art set (via SARM) or is showing Steam's default art:

| Art source | Example `src` | Pattern |
|---|---|---|
| Custom (SARM-managed) | `/customimages/1462040_hero.jpg?v=1784768603` | `/customimages/<appid>_hero` |
| Steam default | `/assets/57300/library_hero.jpg?c=496391688` | `/assets/<appid>/library_hero` |

**A selector targeting one game must match both shapes** (via a comma-separated selector list, or two DOM Selector fields), or games without SARM-managed hero art won't be targetable at all. This is a structural difference from the logo case and needs to be reflected in both the `LogoStyleDomSelectors` type (or a new type) and `compileLogoStyleTheme`'s background rule builder. See the exact match pattern below - it needs the `.jpg` extension included, not just the path prefix (see Uniqueness).

## Uniqueness: three elements share the image class, not one

`document.querySelectorAll(".HNbe3eZf6H7dtJ042x1vM").length` returns `3` on a game's page, not `1` - Steam renders a blurred backdrop effect using duplicate copies of the hero art. Critically, **how the duplicate is implemented differs by art source**:

**Default Steam art** (appid 57300) - the blur duplicates are `<img>` tags with a distinct filename:

```html
<img class="HNbe3eZf6H7dtJ042x1vM HSQWw9HUAP6jtA2OZjS-u" src="/assets/57300/library_hero_blur.jpg?c=496391688">
<img class="HNbe3eZf6H7dtJ042x1vM" src="/assets/57300/library_hero.jpg?c=496391688">
<img class="HNbe3eZf6H7dtJ042x1vM HSQWw9HUAP6jtA2OZjS-u _3_IUVzR9tpG_JKEjhwXEAb" src="/assets/57300/library_hero_blur.jpg?c=496391688">
```

**Custom art** (appid 1462040, SARM-managed) - the blur duplicates are `<canvas>` elements instead (client-rendered, no `src` at all - Steam has no pre-generated blur asset for custom images):

```html
<canvas class="HNbe3eZf6H7dtJ042x1vM HSQWw9HUAP6jtA2OZjS-u" width="134" height="63"></canvas>
<img class="HNbe3eZf6H7dtJ042x1vM" src="/customimages/1462040_hero.jpg?v=1784768603">
<canvas class="HNbe3eZf6H7dtJ042x1vM HSQWw9HUAP6jtA2OZjS-u _3_IUVzR9tpG_JKEjhwXEAb" width="269" height="127"></canvas>
```

In both cases the sharp/main hero is the one plain `<img>` with no extra class beyond `HNbe3eZf6H7dtJ042x1vM`, and the blur duplicates carry an additional `HSQWw9HUAP6jtA2OZjS-u` class (a third, `_3_IUVzR9tpG_JKEjhwXEAb`, showed up on one duplicate in both cases too - likely a transition/crossfade state, not investigated further).

**Whether the blur duplicate should also get positioned is a real design question, not just a matching-precision one.** The blur duplicate isn't unrelated art the way a capsule/icon is for the logo - it's the same hero image, just blurred for an ambient backdrop. Leaving it unmatched means it stays static while the sharp hero shifts, which can look mismatched. Decision (see issue #14): include the blur duplicate in the background rule **where it's reachable**.

That's only true for default art. Scoping to the `img` tag already excludes the canvas-based custom-art duplicates for free (canvas has no `src` to match against, and nothing else ties a given canvas to one specific game - there's no way to reach it with a CSS selector at all). For default art, the `_blur` duplicate is a real `<img>` sharing the same `library_hero` path prefix as the sharp one, differing only by the inserted `_blur` before the extension - matching on that prefix alone (see "No fixed extension" below) picks up both without needing to spell out `_blur` as a separate pattern:

```css
img[src*="/customimages/<appid>_hero"],   /* custom art, sharp only - canvas blur duplicates unreachable */
img[src*="/assets/<appid>/library_hero"]  /* default art, sharp AND blur backdrop (moved in sync with the sharp image) */
```

This means custom-art games (the primary use case - a user is actively theming that game) only get the sharp hero repositioned, while default-art games get both. An accepted, asymmetric tradeoff given the canvas limitation, not an oversight.

## No fixed extension: a real library mixes `.jpg` and `.png`

An earlier version of the selector above required the literal `.jpg` extension (to exclude the `_blur` duplicate by exact filename, before the "match on the shared prefix instead" approach above was adopted). That silently broke background positioning for every game whose hero art wasn't `.jpg` - confirmed by listing a real Steam grid folder (`.../userdata/<id>/config/grid/*_hero.*`): roughly half the entries are `.png`, the rest `.jpg`. The selector must never assume a specific extension; matching on the path prefix alone (as shown above) covers whatever format a given game's source image actually was.

## Remaining open questions

- Only two games were checked (one custom, one default art). Hasn't been verified against other art states (e.g. an animated/video hero, if Steam supports one) or other Big Picture Mode screens (e.g. the store vs. library view, if they differ).

## Implication for the DOM Selectors setting

**Superseded by the final selector design above.** This section originally speculated that the outer container/image classes (`QlR9EFwTdUNm_J5vx54_Z`/`HNbe3eZf6H7dtJ042x1vM`) would need new user-editable settings, mirroring the logo's `outerBoxSelector`/`innerWrapperSelector`, per ADR-0002.

That turned out not to apply: the revised selector (issue #14) doesn't use either class at all. Background positioning only needs `object-position` on the image itself - unlike the logo, there's no outer box to reposition, so there's no reason to touch a class-based selector in the first place. The final selector is built purely from `/customimages/`, `/assets/`, and `library_hero.jpg` - stable, semantic URL/filename conventions, not the bundler-regenerated hashed class names ADR-0002 is actually about (see its rationale: "Steam's Big Picture UI is built with a bundler that regenerates **hashed class names**..."). This is the same category of thing already hardcoded for the logo's own `/logo` filename requirement, which was never made user-editable either. No new DOM Selector settings were added for background positioning.
