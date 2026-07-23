<script lang="ts">
  import { More } from "@icons";
  import { save, type DialogFilter } from "@tauri-apps/plugin-dialog";
  import { createEventDispatcher } from "svelte";
  import type { Placement } from "tippy.js";
  import IconButton from "./IconButton.svelte";

  export let label: string;
  export let dialogTitle: string;
  export let filters: DialogFilter[] = [];
  export let tooltipPosition: Placement = "top-end";
  export let disabled = false;
  export let highlight = false;
  export let warn = false;

  const dispatch = createEventDispatcher();

  /**
   * Handles the onClick event of the icon button.
   */
  async function onClick(): Promise<void> {
    const path = await save({
      title: dialogTitle,
      filters
    });
    if (path && path !== "") dispatch("change", { value: path as string });
  }
</script>

<IconButton label={label} tooltipPosition={tooltipPosition} on:click={onClick} disabled={disabled} highlight={highlight} warn={warn}>
  <More height="0.8rem" width="0.8rem" />
</IconButton>
