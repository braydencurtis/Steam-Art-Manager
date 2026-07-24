<script lang="ts">
  import { AppController, LogController } from "@controllers";
  import { TriangleExclamation } from "@icons";
  import { Button, DropDown, NumberInput, Toggle } from "@interactables";
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

    if (shadow || hasPosition) {
      // NumberInput binds via a type="text" input, so x/y come back
      // as strings at runtime despite their declared type - coerce explicitly.
      overrides[$selectedGameAppId] = hasPosition ? { shadow, position: { x: Number(x), y: Number(y) } } : { shadow };
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
  // TODO Replaced by preset buttons + paired slider/number controls in issue #11.
  const anchorPresets: { label: string, data: string, x: number, y: number }[] = [
    { label: "Top Left", data: "TopLeft", x: 0, y: 0 },
    { label: "Top Center", data: "TopCenter", x: 50, y: 0 },
    { label: "Top Right", data: "TopRight", x: 100, y: 0 },
    { label: "Center Left", data: "CenterLeft", x: 0, y: 50 },
    { label: "Center Center", data: "CenterCenter", x: 50, y: 50 },
    { label: "Center Right", data: "CenterRight", x: 100, y: 50 },
    { label: "Bottom Left", data: "BottomLeft", x: 0, y: 100 },
    { label: "Bottom Center", data: "BottomCenter", x: 50, y: 100 },
    { label: "Bottom Right", data: "BottomRight", x: 100, y: 100 },
  ];
  const anchorOptions = anchorPresets.map(({ label, data }) => ({ label, data }));

  /**
   * Applies the chosen anchor preset's x/y values.
   * @param presetKey The selected preset's key.
   */
  function applyAnchorPreset(presetKey: string): void {
    const preset = anchorPresets.find((p) => p.data === presetKey);
    if (preset) {
      x = preset.x;
      y = preset.y;
    }
  }

  $: games = [ ...$steamGames, ...$manualSteamGames, ...$nonSteamGames ];
  $: game = games.find((game) => game.appid.toString() === $selectedGameAppId)!;

  let open = true;

  const existingOverride = $logoStyleOverrides[$selectedGameAppId];

  const originalShadow = existingOverride?.shadow ?? false;
  const originalHasPosition = !!existingOverride?.position;
  const originalX = existingOverride?.position?.x ?? 50;
  const originalY = existingOverride?.position?.y ?? 50;

  let shadow = originalShadow;
  let hasPosition = originalHasPosition;
  let x = originalX;
  let y = originalY;

  $: canClear = !!existingOverride;
  $: canSave = shadow !== originalShadow
    || hasPosition !== originalHasPosition
    || (hasPosition && (Number(x) !== originalX || Number(y) !== originalY));

  $: hasNativeLogoPosition = $steamLogoPositions[$selectedGameAppId]?.logoPosition.pinnedPosition !== undefined
    && $steamLogoPositions[$selectedGameAppId]?.logoPosition.pinnedPosition !== "REMOVE";

  $: { shadow; hasPosition; x; y; debouncedLiveWrite(); }

  /**
   * Apply the Logo Style Override changes.
   */
  function applyChanges(): void {
    // NumberInput binds via a type="text" input, so x/y come back
    // as strings at runtime despite their declared type - coerce explicitly.
    const override: LogoStyleOverride = hasPosition
      ? { shadow, position: { x: Number(x), y: Number(y) } }
      : { shadow };

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
      {#if hasPosition}
        <div class="anchor">
          <DropDown label="Preset" options={anchorOptions} value="" onChange={applyAnchorPreset} width="8.75rem" direction="UP" />
        </div>
        <NumberInput label="X" bind:value={x} />
        <NumberInput label="Y" bind:value={y} />
      {/if}
    </div>
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

  .buttons {
    width: calc(100% - 1.25rem);
    padding: 0rem 0.625rem 0.625rem;

    display: flex;
    align-items: center;

    gap: 0.5rem;
  }

  .anchor { width: 13.75rem; }
</style>
