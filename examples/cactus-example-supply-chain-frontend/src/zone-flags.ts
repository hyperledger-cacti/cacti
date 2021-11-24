/**
 * Prevents Angular change detection from
 * running with certain Web Component callbacks
 */
type WindowWithZone = Window &
  typeof globalThis & { __Zone_disable_customElements: boolean };
(window as WindowWithZone).__Zone_disable_customElements = true;
