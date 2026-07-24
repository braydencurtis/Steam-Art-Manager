# DOM Selectors are a user-editable setting, and auto-detection is deferred

Steam's Big Picture UI is built with a bundler that regenerates hashed class names (e.g. `_2Eh7Soh97QONu_grMi2m66`) on client updates, so any CSS keyed to today's hash can silently stop matching after Steam updates — shadows and positioning would just vanish with no error. Rather than hardcoding these fragments into SARM's source, which would tie a fix to a new SARM release, they're stored as an editable setting defaulting to today's known-good values, so a break can be fixed via the same DevTools inspect-element workflow already used to discover them.

Automatic re-detection is technically feasible — Steam's "Enable Developer Tools" setting exposes a CEF remote-debugging port using the same Chrome DevTools Protocol, which a client could connect to and query the live DOM for the current class names. It's a substantially larger, separate feature (a CDP client, plus a structural heuristic to identify the right ancestor elements without relying on the class names it's trying to discover), so it's deferred until the editable-setting approach proves insufficient in practice.

## Status

Accepted.
