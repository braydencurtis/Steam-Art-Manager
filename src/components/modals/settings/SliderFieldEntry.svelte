<script lang="ts">
  import { Slider } from "@interactables";

  export let label: string;
  export let description: string;
  export let value: number;
  export let min: number = 0;
  export let max: number = 100;
  export let onChange: (value: number) => void = () => {};

  /**
   * A wrapper for the slider's change event.
   */
  function changeWrapper(): void {
    onChange(value);
  }
</script>

<div class="setting">
  <div class="field-header">
    <h1 class="label">{label}</h1>
  </div>
  <div class="inputs">
    <Slider min={min} max={max} bind:value={value} width="13.75rem" on:change={changeWrapper} />
    <span class="value">{value}</span>
  </div>
  <div class="description">
    <div class="part">
      <b>Usage:</b><br/>
      <!-- eslint-disable-next-line svelte/no-at-html-tags -->
      {@html description}<br/>
    </div>
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

  .label {
    margin-top: 0rem;
    font-size: 1rem;
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

  .inputs {
    display: flex;
    align-items: center;

    gap: 0.5rem;
  }

  .value {
    font-size: 0.875rem;
    min-width: 2rem;
  }
</style>
