<script lang="ts">
  import { AppController } from "@controllers";
  import { Asterisk } from "@icons";
  import { SaveFileButton, TextInput } from "@interactables";
  import { open } from "@tauri-apps/plugin-shell";
  import type { DialogFilter } from "@tauri-apps/plugin-dialog";

  export let label: string;
  export let description: string;
  export let required: boolean = false;
  export let value: string;
  export let notes: string = "";
  export let dialogTitle: string;
  export let filters: DialogFilter[] = [];
  export let onChange: (path: string) => void = () => {};

  /**
   * A wrapper for the text input's change event.
   */
  function changeWrapper(): void {
    onChange(value);
  }

  /**
   * A wrapper for the dialog's change event.
   * @param path The new path.
   */
  function dialogChangeWrapper(path: string): void {
    value = path;
    onChange(path);
  }

  /**
   * Handles click events to redirect to the browser.
   * @param e The click event.
   */
  function clickListener(e: Event) {
    const origin = (e.target as Element).closest("a");

    if (origin) {
      e.preventDefault();
      const href = origin.href;
      open(href);
    }
  }
</script>

<div class="setting">
  <div class="field-header">
    <h1 class="label">{label}</h1>
    <div class="required-cont">
      {#if required}
        <div class="tooltip-cont" use:AppController.tippy={{ content: "This setting is required", placement: "top", onShow: AppController.onTippyShow }}>
          <Asterisk style="height: 0.875rem; width: 0.875rem; fill: var(--font-color);" />
        </div>
      {/if}
    </div>
  </div>
  <div class="inputs">
    <TextInput placeholder={"~/something/something.css"} on:change={changeWrapper} width="11.75rem" bind:value={value} />
    <SaveFileButton label="Select File" dialogTitle={dialogTitle} filters={filters} tooltipPosition={"right"} on:change={(e) => dialogChangeWrapper(e.detail.value)} />
  </div>
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div class="description" on:click={clickListener}>
    <div class="part">
      <b>Usage:</b><br/>
      <!-- eslint-disable-next-line svelte/no-at-html-tags -->
      {@html description}<br/>
    </div>

    {#if notes !== ""}
      <div class="part">
        <b>Notes:</b><br/>
        <!-- eslint-disable-next-line svelte/no-at-html-tags -->
        {@html notes}
      </div>
    {/if}
  </div>
</div>

<style>
  .setting {
    display: flex;
    flex-direction: column;
    align-items: flex-start;

    background-color: var(--background-dark);
    padding: 0.5rem;
    border-radius: 0.25rem;
  }

  .field-header {
    width: 100%;
    display: flex;
    justify-content: space-between;
  }

  .required-cont {
    height: 0.875rem;
    width: 0.875rem;
  }

  .label {
    margin-top: 0rem;
    font-size: 1rem;
  }

  .inputs {
    display: flex;
    align-items: center;

    gap: 0.5rem;
  }

  .part {
    width: 100%;
  }

  .description {
    line-height: 1.5rem;
    font-size: 0.875rem;
    margin: 0.5rem 0rem;

    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
</style>
