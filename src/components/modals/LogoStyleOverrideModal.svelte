<script lang="ts">
  import { AppController, LogController } from "@controllers";
  import { TriangleExclamation } from "@icons";
  import { Button, PercentSlider, Toggle } from "@interactables";
  import { logoStyleDomSelectors, logoStyleOverrides, logoStyleShadowStyle, logoStyleThemeCssPath, manualSteamGames, nonSteamGames, selectedGameAppId, steamGames, steamLogoPositions } from "@stores/AppState";
  import { showLogoStyleOverrideModal } from "@stores/Modals";
  import { writeTextFile } from "@tauri-apps/plugin-fs";
  import type { LogoStyleOverride } from "@types";
  import { compileLogoStyleTheme, debounce } from "@utils";
  import { get } from "svelte/store";
  import ModalBody from "./modal-utils/ModalBody.svelte";

  /**
   * Writes a live preview of the Theme CSS to disk, so open-modal edits show up in
   * Big Picture Mode immediately instead of waiting for the app's global Save.
   * @param overrides The override map to compile and write.
   */
  async function writeThemeCssPreview(overrides: Record<string, LogoStyleOverride>): Promise<void> {
    const path = get(logoStyleThemeCssPath);
    if (path === "") return;

    const css = compileLogoStyleTheme(overrides, get(logoStyleShadowStyle), get(logoStyleDomSelectors));
    try {
      await writeTextFile(path, css);
    } catch (e: any) {
      LogController.error(`Failed to write Logo Style Theme CSS preview: ${e?.message ?? e}`);
    }
  }

  /**
   * Builds the override map as it would look if the in-progress modal edit were applied,
   * without actually staging it into the logoStyleOverrides store.
   */
  function liveOverrides(): Record<string, LogoStyleOverride> {
    const overrides = { ...get(logoStyleOverrides) };

    if (shadow || hasPosition || hasBackground) {
      overrides[$selectedGameAppId] = {
        shadow,
        ...(hasPosition ? { position: { x, y } } : {}),
        ...(hasBackground ? { background: { x: backgroundX } } : {}),
      };
    } else {
      delete overrides[$selectedGameAppId];
    }

    return overrides;
  }

  const debouncedLiveWrite = debounce(() => writeThemeCssPreview(liveOverrides()), 150);

  /**
   * The function to run when the modal closes.
   */
  function onClose(): void {
    $showLogoStyleOverrideModal = false;
    // Revert the live preview back to whatever's actually staged, in case the
    // modal is closing without having applied the in-progress edit.
    writeThemeCssPreview(get(logoStyleOverrides));
  }

  // Anchor presets are a UI-only convenience - picking one just sets x/y below,
  // nothing about "which anchor was picked" is stored or persisted.
  const anchorPresets: { label: string, x: number, y: number }[] = [
    { label: "Top Left", x: 0, y: 0 },
    { label: "Top Center", x: 50, y: 0 },
    { label: "Top Right", x: 100, y: 0 },
    { label: "Center Left", x: 0, y: 50 },
    { label: "Center Center", x: 50, y: 50 },
    { label: "Center Right", x: 100, y: 50 },
    { label: "Bottom Left", x: 0, y: 100 },
    { label: "Bottom Center", x: 50, y: 100 },
    { label: "Bottom Right", x: 100, y: 100 },
  ];

  /**
   * Applies the chosen anchor preset's x/y values.
   * @param preset The selected preset.
   */
  function applyAnchorPreset(preset: { x: number, y: number }): void {
    x = preset.x;
    y = preset.y;
  }

  $: games = [ ...$steamGames, ...$manualSteamGames, ...$nonSteamGames ];
  $: game = games.find((game) => game.appid.toString() === $selectedGameAppId)!;

  let open = true;

  const existingOverride = $logoStyleOverrides[$selectedGameAppId];

  const originalShadow = existingOverride?.shadow ?? false;
  const originalHasPosition = !!existingOverride?.position;
  const originalX = existingOverride?.position?.x ?? 50;
  const originalY = existingOverride?.position?.y ?? 50;
  const originalHasBackground = !!existingOverride?.background;
  const originalBackgroundX = existingOverride?.background?.x ?? 50;

  let shadow = originalShadow;
  let hasPosition = originalHasPosition;
  let x = originalX;
  let y = originalY;
  let hasBackground = originalHasBackground;
  let backgroundX = originalBackgroundX;

  $: canClear = !!existingOverride;
  $: canSave = shadow !== originalShadow
    || hasPosition !== originalHasPosition
    || (hasPosition && (x !== originalX || y !== originalY))
    || hasBackground !== originalHasBackground
    || (hasBackground && backgroundX !== originalBackgroundX);

  $: hasNativeLogoPosition = $steamLogoPositions[$selectedGameAppId]?.logoPosition.pinnedPosition !== undefined
    && $steamLogoPositions[$selectedGameAppId]?.logoPosition.pinnedPosition !== "REMOVE";

  $: { shadow; hasPosition; x; y; hasBackground; backgroundX; debouncedLiveWrite(); }

  /**
   * Apply the Logo Style Override changes.
   */
  function applyChanges(): void {
    const override: LogoStyleOverride = {
      shadow,
      ...(hasPosition ? { position: { x, y } } : {}),
      ...(hasBackground ? { background: { x: backgroundX } } : {}),
    };

    AppController.setLogoStyleOverride($selectedGameAppId, override);
    onClose();
  }

  /**
   * Clears any Logo Style Override made to this game.
   */
  function clearOverride(): void {
    AppController.clearLogoStyleOverride($selectedGameAppId);
    onClose();
  }

  /**
   * Handles a change from one of the position PercentSliders.
   * @param axis Which axis to update.
   */
  function onPositionChange(axis: "x" | "y"): (value: number) => void {
    return (value: number) => {
      if (axis === "x") x = value;
      else y = value;
    };
  }

  /**
   * Handles a change from the background PercentSlider.
   * @param value The new background X value.
   */
  function onBackgroundXChange(value: number): void {
    backgroundX = value;
  }
</script>

<ModalBody title={`Set Logo Style for ${game?.name}`} open={open} on:close={() => open = false} on:closeEnd={onClose}>
  <div class="content">
    {#if hasNativeLogoPosition}
      <div class="warning">
        <TriangleExclamation style="height: 0.875rem; width: 0.875rem; fill: var(--warning); flex-shrink: 0;" />
        <span>This game also has a native Steam logo position set. This Logo Style Override will take visual priority over it.</span>
      </div>
    {/if}
    <div class="interactables">
      <Toggle label="Shadow" bind:value={shadow} />
      <Toggle label="Custom Position" bind:value={hasPosition} />
      <Toggle label="Background Position" bind:value={hasBackground} />
    </div>
    {#if hasPosition}
      <div class="position-section">
        <div class="presets">
          {#each anchorPresets as preset}
            <Button width="5.5rem" on:click={() => applyAnchorPreset(preset)}>{preset.label}</Button>
          {/each}
        </div>
        <div class="sliders">
          <PercentSlider label="X" value={x} onChange={onPositionChange("x")} />
          <PercentSlider label="Y" value={y} onChange={onPositionChange("y")} />
        </div>
      </div>
    {/if}
    {#if hasBackground}
      <div class="background-section">
        <PercentSlider label="Background X" value={backgroundX} onChange={onBackgroundXChange} />
      </div>
    {/if}
    <div class="buttons">
      {#if canClear}
        <Button on:click={applyChanges} width="11.5rem" disabled={!canSave}>Save</Button>
        <Button on:click={clearOverride} width="6.5rem">Reset</Button>
      {:else}
        <Button on:click={applyChanges} width="18.75rem" disabled={!canSave}>Save</Button>
      {/if}
    </div>
  </div>
</ModalBody>

<style>
  .content {
    min-width: 12.5rem;

    display: flex;
    flex-direction: column;
    gap: 0.625rem;

    padding-top: 0.625rem;
  }

  .warning {
    width: calc(100% - 1.25rem);
    margin: 0rem 0.625rem;
    padding: 0.5rem;

    display: flex;
    align-items: center;
    gap: 0.5rem;

    font-size: 0.875rem;
    color: var(--warning);

    background-color: var(--background-dark);
    border-radius: 0.25rem;
  }

  .interactables {
    width: calc(100% - 1.25rem);
    padding: 0rem 0.625rem;

    display: flex;
    align-items: center;

    gap: 1rem;
  }

  .position-section {
    width: calc(100% - 1.25rem);
    padding: 0rem 0.625rem;

    display: flex;
    align-items: flex-start;

    gap: 1rem;
  }

  .presets {
    display: grid;
    grid-template-columns: repeat(3, 5.5rem);
    gap: 0.375rem;
  }

  .sliders {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .background-section {
    width: calc(100% - 1.25rem);
    padding: 0rem 0.625rem;
  }

  .buttons {
    width: calc(100% - 1.25rem);
    padding: 0rem 0.625rem 0.625rem;

    display: flex;
    align-items: center;

    gap: 0.5rem;
  }
</style>
