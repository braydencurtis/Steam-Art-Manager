<script lang="ts">
  import { afterUpdate } from "svelte";
  import NumberInput from "./NumberInput.svelte";
  import Slider from "./Slider.svelte";

  export let label: string = "";
  export let min: number = 0;
  export let max: number = 100;
  export let value: number;
  export let width: string = "10rem";
  export let onChange: (value: number) => void = () => {};

  // NumberInput binds via a type="text" input, so its bound value comes back as
  // a string at runtime despite the `number` type - keep it in its own local so
  // it never leaks into `value`, which every consumer expects to stay numeric.
  let numberValue: any = value;

  /**
   * Clamps a value to this slider's [min, max] range.
   * @param raw The value to clamp.
   */
  function clamp(raw: number): number {
    return Math.min(max, Math.max(min, raw));
  }

  // Keep the number field in sync whenever `value` changes for any reason -
  // a slider drag, or the parent reassigning the prop directly (e.g. a preset).
  $: numberValue = value;

  // NumberInput's bind:value updates numberValue on every keystroke but never
  // forwards an event a parent can listen to (it only consumes input locally),
  // so there's nothing to `on:input`. Checking in afterUpdate - rather than a
  // second `$:` block reading numberValue and writing value - is deliberate:
  // that would create `numberValue -> value -> numberValue`, a reactive cycle
  // Svelte's compiler rejects outright.
  afterUpdate(() => {
    // Skip while the field is empty or mid-edit (e.g. the user just backspaced
    // it to type a replacement) - Number("") is 0, and committing that on every
    // keystroke would snap the slider before the user finishes typing.
    if (numberValue === "" || Number.isNaN(Number(numberValue))) return;

    const coerced = clamp(Number(numberValue));
    if (coerced !== value) {
      value = coerced;
      onChange(coerced);
    }
  });

  /**
   * Notifies the parent of the slider's new value.
   */
  function onSliderChange(): void {
    onChange(value);
  }
</script>

<div class="percent-slider">
  {#if label !== ""}
    <!-- svelte-ignore a11y-label-has-associated-control -->
    <label>{label}:</label>
  {/if}
  <Slider min={min} max={max} bind:value={value} width={width} on:change={onSliderChange} />
  <NumberInput bind:value={numberValue} />
</div>

<style>
  .percent-slider {
    display: flex;
    align-items: center;
    gap: 0.5rem;

    font-size: 0.875rem;
    color: var(--font-color);
  }

  .percent-slider > label {
    user-select: none;
  }
</style>
