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

**A selector targeting one game must match both shapes** (via a comma-separated selector list, or two DOM Selector fields), or games without SARM-managed hero art won't be targetable at all. This is a structural difference from the logo case and needs to be reflected in both the `LogoStyleDomSelectors` type (or a new type) and `compileLogoStyleTheme`'s background rule builder.

Draft selector shape for a given `appid`:

```css
img[src*="/customimages/<appid>_hero"],
img[src*="/assets/<appid>/library_hero"]
```

## Open questions / not yet confirmed

- **Uniqueness**: not confirmed whether `QlR9EFwTdUNm_J5vx54_Z`/`HNbe3eZf6H7dtJ042x1vM` appear exactly once per game page (vs. also matching a thumbnail or a second/smaller preview elsewhere in the DOM). Worth a duplicate-count check (e.g. `document.querySelectorAll(".HNbe3eZf6H7dtJ042x1vM").length` in the console while on a game's page) before shipping issue #14, since a non-unique match could apply background positioning to the wrong element.
- Only two games were checked (one custom, one default art). Hasn't been verified against other art states (e.g. an animated/video hero, if Steam supports one) or other Big Picture Mode screens (e.g. the store vs. library view, if they differ).

## Implication for the DOM Selectors setting

Per ADR-0002, these should be added as new user-editable settings (mirroring `outerBoxSelector`/`innerWrapperSelector`), likely as something like `heroOuterBoxSelector`/`heroImageClassSelector`, since Steam's bundler regenerates these hashes on client updates just like the logo's.
