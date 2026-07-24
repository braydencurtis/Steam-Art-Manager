# Logo Style Override is a separate system from native Logo Position, and wins on conflict

SARM already has a native **Logo Position** feature that writes pinned-corner + size% directly into Steam's own per-app grid config — a format with no way to express a drop-shadow, and not ours to extend since it's Steam's own file. We built **Logo Style Override** as an additive system instead: it generates CSS for a CSS-Loader theme rather than touching Steam's native config. Because that CSS relies on `!important` to reliably beat the inline styles Steam applies from the native config, when a game has both set, the Logo Style Override always wins visually — Logo Position becomes inert for that game but stays stored and visible in its own modal. The Logo Style Override modal warns when this overlap exists rather than silently doing nothing, or auto-clearing the native setting, since clearing it would be a destructive action taken on the user's behalf.

## Status

Accepted.
