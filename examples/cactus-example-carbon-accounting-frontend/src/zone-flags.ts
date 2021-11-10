type WindowWithZone = { __Zone_disable_customElements: boolean } & Window & typeof globalThis;

/**
 * Prevents Angular change detection from
 * running with certain Web Component callbacks
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(window as any).__Zone_disable_customElements = true;
