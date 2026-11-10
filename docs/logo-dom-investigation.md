# Proposal: Logo Positioning & Drop Shadow Engine for Steam Art Manager

## 1. Overview & Context
We are extending a fork of **Steam Art Manager** (a Windows tool targeting Steam Big Picture Mode / CSS-Loader themes) to add fine-grained UI customization features for game logos.

Currently, Steam Big Picture Mode (and standard CSS-Loader themes) allows setting logo positions globally or via basic alignment defaults. However, artwork variations make certain logos unreadable or poorly positioned on a per-game basis.

This update introduces an automated system within Steam Art Manager that:
1. Targets individual game logos using Steam's internal asset paths (`App ID`).
2. Provides **Top-Left** and **Center-Left** logo positioning overrides.
3. Applies a **legibility drop-shadow** behind transparent PNG logos using CSS filters.
4. Uses **CSS Variables** at the top of the generated theme stylesheet so margins and shadow intensities remain globally configurable.

---

## 2. Core Technical Strategy

### Steam CEF UI Structure & Class Names
Steam Big Picture Mode runs on Chromium Embedded Framework (CEF). Steam positions game logos using an outer layout bounding box (`div`) and an inner image wrapper.

* **Outer Bounding Box Class:** Contains `_2Eh7Soh97QONu_grMi2m66` (Note: Steam updates hashes over time, so wildcard/attribute targeting like `div[class*="_2Eh7Soh97QONu_grMi2m66"]` or parent layout wrappers are used).
* **Inner Image Container Class:** `_2DVdg_N1qLNDdnxJqN-RBX`
* **App ID Extraction:** Steam embeds the game's App ID into the `src` attribute of the logo image element:
  `src="/assets/<APP_ID>/<HASH>/logo.png"` (e.g., `src="/assets/2909400/459032.../logo.png"`).

By matching `img[src*="/<APP_ID>/"]` within a parent selector, we can target individual games cleanly without needing Linux/SteamOS Decky plugins on Windows 11.

---

## 3. CSS Architecture Specifications

The generated theme file (`theme.css` or `shared.css`) must follow this exact structural template:

```css
/* ==========================================================================
   0. GLOBAL VARIABLES & CONFIG (CONTROL PANEL)
   ========================================================================== */
:root {
    /* Edge Spacing */
    --logo-margin-top: 20px;
    --logo-margin-left: 32px;

    /* Drop-Shadow Effect */
    --logo-shadow: drop-shadow(0px 4px 30px rgba(0, 0, 0, 0.85)) 
                   drop-shadow(0px 2px 4px rgba(0, 0, 0, 0.6));
}


/* ==========================================================================
   1. TOP-LEFT LOGOS (BY APP ID)
   ========================================================================== */

/* Outer Box: Force to Top-Left */
div[class*="_2Eh7Soh97QONu_grMi2m66"]:has(img[src*="/2909400/"]), /* FF7 Rebirth */
div[class*="_2Eh7Soh97QONu_grMi2m66"]:has(img[src*="/1091500/"])  /* Cyberpunk 2077 */
{
    top: 0% !important;
    left: 0% !important;
    margin: 0 !important;
    padding: 0 !important;
    transform: none !important;

    margin-top: var(--logo-margin-top) !important;
    margin-left: var(--logo-margin-left) !important;
}

/* Inner Flex Alignment */
div[class*="_2Eh7Soh97QONu_grMi2m66"]:has(img[src*="/2909400/"]) > div,
div[class*="_2Eh7Soh97QONu_grMi2m66"]:has(img[src*="/1091500/"]) > div 
{
    display: flex !important;
    align-items: flex-start !important;
    justify-content: flex-start !important;
    margin: 0 !important;
    padding: 0 !important;
}

/* Image Anchor */
img[src*="/2909400/"],
img[src*="/1091500/"] 
{
    object-position: left top !important;
    margin: 0 !important;
}


/* ==========================================================================
   2. CENTER-LEFT LOGOS (BY APP ID)
   ========================================================================== */

/* Outer Box: Force to Vertical Center & Left Edge */
div[class*="_2Eh7Soh97QONu_grMi2m66"]:has(img[src*="/1462040/"]), /* FF7 Remake Intergrade */
div[class*="_2Eh7Soh97QONu_grMi2m66"]:has(img[src*="/570/"])     /* Dota 2 */
{
    top: 50% !important;
    left: 0% !important;
    margin: 0 !important;
    padding: 0 !important;
    transform: translateY(-50%) !important;

    margin-left: var(--logo-margin-left) !important;
}

/* Inner Flex Alignment */
div[class*="_2Eh7Soh97QONu_grMi2m66"]:has(img[src*="/1462040/"]) > div,
div[class*="_2Eh7Soh97QONu_grMi2m66"]:has(img[src*="/570/"]) > div 
{
    display: flex !important;
    align-items: center !important;
    justify-content: flex-start !important;
    margin: 0 !important;
    padding