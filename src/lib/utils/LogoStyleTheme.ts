import type { AnchorPosition, LogoShadowStyle, LogoStyleDomSelectors, LogoStyleOverride } from "@types";

type AxisAnchor = {
  vertical: "Top" | "Center" | "Bottom",
  horizontal: "Left" | "Center" | "Right",
};

function parseAnchor(anchor: AnchorPosition): AxisAnchor {
  const [vertical, horizontal] = anchor.match(/^(Top|Center|Bottom)(Left|Center|Right)$/)!.slice(1) as [AxisAnchor["vertical"], AxisAnchor["horizontal"]];
  return { vertical, horizontal };
}

function buildPositionProps({ vertical, horizontal }: AxisAnchor): string[] {
  const props: string[] = [];

  if (vertical === "Top") props.push("top: 0% !important;");
  else if (vertical === "Center") props.push("top: 50% !important;");
  else props.push("bottom: 0% !important;");

  if (horizontal === "Left") props.push("left: 0% !important;");
  else if (horizontal === "Center") props.push("left: 50% !important;");
  else props.push("right: 0% !important;");

  return props;
}

function buildTransform({ vertical, horizontal }: AxisAnchor, offsetX: number, offsetY: number): string {
  const parts: string[] = [];

  if (vertical === "Center" || horizontal === "Center") {
    const x = horizontal === "Center" ? "-50%" : "0%";
    const y = vertical === "Center" ? "-50%" : "0%";
    parts.push(`translate(${x}, ${y})`);
  }

  if (offsetX !== 0 || offsetY !== 0) {
    parts.push(`translate(${offsetX}px, ${offsetY}px)`);
  }

  return parts.length > 0 ? parts.join(" ") : "none";
}

function buildObjectPosition({ vertical, horizontal }: AxisAnchor): string {
  const x = horizontal === "Left" ? "left" : horizontal === "Center" ? "center" : "right";
  const y = vertical === "Top" ? "top" : vertical === "Center" ? "center" : "bottom";
  return `${x} ${y}`;
}

function buildFlexAlign({ vertical, horizontal }: AxisAnchor): { alignItems: string, justifyContent: string } {
  return {
    alignItems: vertical === "Top" ? "flex-start" : vertical === "Center" ? "center" : "flex-end",
    justifyContent: horizontal === "Left" ? "flex-start" : horizontal === "Center" ? "center" : "flex-end",
  };
}

function compileGameRules(appid: string, override: LogoStyleOverride, domSelectors: LogoStyleDomSelectors): string {
  // Steam serves other art (hero/background images, capsules, etc.) under the
  // same "/<appid>/" URL prefix as the logo, just with a different filename -
  // matching on the appid alone would also catch that unrelated art.
  const imgSelector = `img[src*="/${appid}/logo"]`;
  const outerSelector = `div[class*="${domSelectors.outerBoxSelector}"]:has(${imgSelector})`;
  const innerSelector = `${outerSelector} > div[class*="${domSelectors.innerWrapperSelector}"]`;

  const blocks: string[] = [];
  const imgProps: string[] = [];

  if (override.position) {
    const axis = parseAnchor(override.position.anchor);
    const { alignItems, justifyContent } = buildFlexAlign(axis);

    blocks.push([
      `${outerSelector} {`,
      ...buildPositionProps(axis).map((line) => `  ${line}`),
      "  margin: 0 !important;",
      "  padding: 0 !important;",
      `  transform: ${buildTransform(axis, override.position.offsetX, override.position.offsetY)} !important;`,
      "}",
    ].join("\n"));

    blocks.push([
      `${innerSelector} {`,
      "  display: flex !important;",
      `  align-items: ${alignItems} !important;`,
      `  justify-content: ${justifyContent} !important;`,
      "  margin: 0 !important;",
      "  padding: 0 !important;",
      "}",
    ].join("\n"));

    imgProps.push(`  object-position: ${buildObjectPosition(axis)} !important;`, "  margin: 0 !important;");
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
