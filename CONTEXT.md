# Steam Art Manager

A desktop tool for managing the artwork (grids, banners, heroes, logos) of a user's Steam library, extended with per-game visual customization for CSS-Loader-based Big Picture Mode theming.

## Language

### Logo positioning

**Logo Position** (native):
Steam's own per-game logo placement setting — a pinned corner (`BottomLeft`/`CenterCenter`/`UpperCenter`/`BottomCenter`) plus width/height percentage, read from and written to Steam's native per-app grid config file. Managed via the existing `LogoPositionModal`.
_Avoid_: logo placement, logo config

**Logo Style Override**:
A per-game record — shadow, Position, and Background Position, each independently optional — that SARM compiles into the Theme CSS for a CSS-Loader theme. Independent of Logo Position, and takes visual priority over it when both are set on the same game.
_Avoid_: CSS override, logo customization

**Position**:
A logo's placement within its bounding box, as continuous X/Y percentages (0-100 each) rather than a discrete anchor + pixel offset. Anchor presets (e.g. "Bottom Right") exist only as a UI convenience that sets X/Y — they are never persisted.
_Avoid_: Anchor, Offset (superseded — see issue #7/#8)

**Background Position**:
A background/hero image's horizontal placement, as a continuous X percentage (0-100). X-only for now (issue #12); no CSS is generated for it yet (issue #14).

### Theme output

**Theme CSS**:
The standalone `.css` file SARM generates and owns, containing every game's active Logo Style Override. Imported once into the user's CSS-Loader theme via `@import` — SARM never writes into the user's own theme files.
_Avoid_: generated stylesheet, output file

**DOM Selectors**:
User-editable settings holding the CSS class-name fragments SARM uses to target Steam's CEF-rendered logo elements. Editable rather than hardcoded, since Steam's bundler regenerates these hashes on client updates.
_Avoid_: class hashes, selector config
