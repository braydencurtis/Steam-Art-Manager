<script lang="ts">
  import { AppController } from "@controllers";
  import { TriangleExclamation } from "@icons";
  import { Button, DropDown, NumberInput, Toggle } from "@interactables";
  import { appLibraryCache, logoStyleDomSelectors, logoStyleOverrides, logoStyleShadowStyle, logoStyleThemeCssPath, manualSteamGames, nonSteamGames, selectedGameAppId, steamGames, steamLogoPositions, unfilteredLibraryCache } from "@stores/AppState";
  import { showLogoStyleOverrideModal } from "@stores/Modals";
  import { convertFileSrc } from "@tauri-apps/api/core";
  import { writeTextFile } from "@tauri-apps/plugin-fs";
  import type { AnchorPosition, LogoStyleOverride } from "@types";
  import { compileLogoStyleTheme, debounce, IMAGE_FADE_OPTIONS } from "@utils";
  import { get } from "svelte/store";
  import { onMount } from "svelte";
  import { fade } from "svelte/transition";
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
    await writeTextFile(path, css);
  }

  /**
   * Builds the override map as it would look if the in-progress modal edit were applied,
   * without actually staging it into the logoStyleOverrides store.
   */
  function liveOverrides(): Record<string, LogoStyleOverride> {
    const overrides = { ...get(logoStyleOverrides) };

    if (shadow || hasPosition) {
      overrides[$selectedGameAppId] = hasPosition ? { shadow, position: { anchor, offsetX, offsetY } } : { shadow };
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

  const anchors: AnchorPosition[] = [
    "TopLeft", "TopCenter", "TopRight",
    "CenterLeft", "CenterCenter", "CenterRight",
    "BottomLeft", "BottomCenter", "BottomRight",
  ];
  const anchorOptions = anchors.map((anchorPos: AnchorPosition) => {
    return {
      label: anchorPos.split(/(?=[A-Z])/).join(" "),
      data: anchorPos
    }
  });

  $: games = [ ...$steamGames, ...$manualSteamGames, ...$nonSteamGames ];
  $: game = games.find((game) => game.appid.toString() === $selectedGameAppId)!;
  let heroPath = "";
  let logoPath = "";

  let open = true;

  const existingOverride = $logoStyleOverrides[$selectedGameAppId];

  const originalShadow = existingOverride?.shadow ?? false;
  const originalHasPosition = !!existingOverride?.position;
  const originalAnchor: AnchorPosition = existingOverride?.position?.anchor ?? "CenterCenter";
  const originalOffsetX = existingOverride?.position?.offsetX ?? 0;
  const originalOffsetY = existingOverride?.position?.offsetY ?? 0;

  let shadow = originalShadow;
  let hasPosition = originalHasPosition;
  let anchor = originalAnchor;
  let offsetX = originalOffsetX;
  let offsetY = originalOffsetY;

  $: canClear = !!existingOverride;
  $: canSave = shadow !== originalShadow
    || hasPosition !== originalHasPosition
    || (hasPosition && (anchor !== originalAnchor || offsetX !== originalOffsetX || offsetY !== originalOffsetY));

  $: hasNativeLogoPosition = $steamLogoPositions[$selectedGameAppId]?.logoPosition.pinnedPosition !== undefined
    && $steamLogoPositions[$selectedGameAppId]?.logoPosition.pinnedPosition !== "REMOVE";

  const widths = {
    "Hero": 59.75,
    "Logo": 12.5
  };

  const heights = {
    "Hero": 21.375,
    "Logo": 25.125
  };

  /**
   * Gets the preview alignment for the given anchor.
   * @param anchorPos The anchor to align the preview to.
   */
  function getPreviewAlign(anchorPos: AnchorPosition): { justifyContent: string, alignItems: string } {
    return {
      justifyContent: anchorPos.includes("Left") ? "flex-start" : anchorPos.includes("Right") ? "flex-end" : "center",
      alignItems: anchorPos.includes("Top") ? "flex-start" : anchorPos.includes("Bottom") ? "flex-end" : "center",
    };
  }

  $: previewAlign = getPreviewAlign(anchor);
  $: previewTransform = hasPosition ? `translate(${offsetX}px, ${offsetY}px)` : "none";
  $: previewFilter = shadow ? $logoStyleShadowStyle : "none";

  $: { shadow; hasPosition; anchor; offsetX; offsetY; debouncedLiveWrite(); }

  /**
   * Apply the Logo Style Override changes.
   */
  function applyChanges(): void {
    const override: LogoStyleOverride = hasPosition
      ? { shadow, position: { anchor, offsetX, offsetY } }
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

  onMount(() => {
    if ($appLibraryCache[$selectedGameAppId]?.Hero) {
      if ($appLibraryCache[$selectedGameAppId].Hero === "REMOVE") {
        const heroImagePath = $unfilteredLibraryCache[$selectedGameAppId].Hero;
        heroPath = heroImagePath ? convertFileSrc(heroImagePath) : "";
      } else {
        heroPath = convertFileSrc($appLibraryCache[$selectedGameAppId].Hero);
      }
    } else {
      heroPath = "";
    }

    if ($appLibraryCache[$selectedGameAppId]?.Logo) {
      if ($appLibraryCache[$selectedGameAppId].Logo === "REMOVE") {
        const logoImagePath = $unfilteredLibraryCache[$selectedGameAppId].Logo;
        logoPath = logoImagePath ? convertFileSrc(logoImagePath) : "";
      } else {
        logoPath = convertFileSrc($appLibraryCache[$selectedGameAppId].Logo);
      }
    }
  });
</script>

<ModalBody title={`Set Logo Style for ${game?.name}`} open={open} on:close={() => open = false} on:closeEnd={onClose}>
  <div class="content">
    <div class="view">
      <div class="hero-cont">
        <div class="img" class:missing-background={heroPath === ""} style="max-height: {heights.Hero}rem;">
          {#if heroPath !== ""}
            <img src="{heroPath}" alt="Hero image for {game?.name}" style="max-width: {widths.Hero}rem; max-height: {heights.Hero}rem; width: auto; height: auto;" />
          {/if}
        </div>
      </div>
      <div class="logo-cont" style="justify-content: {previewAlign.justifyContent}; align-items: {previewAlign.alignItems};">
        <img in:fade={IMAGE_FADE_OPTIONS} src="{logoPath}" alt="Logo image for {game?.name}" style="max-height: {heights.Logo}%; max-width: {widths.Logo}%; width: auto; height: auto; transform: {previewTransform}; filter: {previewFilter};" />
      </div>
    </div>
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
          <DropDown label="Anchor" options={anchorOptions} bind:value={anchor} width="8.75rem" direction="UP" />
        </div>
        <NumberInput label="X Offset" bind:value={offsetX} />
        <NumberInput label="Y Offset" bind:value={offsetY} />
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
    min-height: calc(100% - 1.25rem);

    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }

  .view {
    width: 100%;
    position: relative;
    margin: 0.625rem 0;

    display: flex;
  }

  .logo-cont {
    position: absolute;
    display: flex;
    width: 100%;
    height: 100%;
  }

  .hero-cont > .img {
    border-radius: 0.125rem;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }

  .missing-background {
    width: 59.75rem;
    height: 21.375rem;
    border-radius: 0.125rem;
    background-color: #a3a3a3;
    background-image: linear-gradient(140deg, #adadad 0%, #727272 50%, #535353 75%);
  }

  .warning {
    width: calc(100% - 1.25rem);
    margin: 0rem 0.625rem 0.625rem;
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
    padding: 0rem 0.625rem;

    display: flex;
    align-items: center;

    gap: 0.5rem;
  }

  .anchor { width: 13.75rem; }
</style>
