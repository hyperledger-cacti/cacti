/**
 * Shared vitest (jsdom) setup for the ledger browser frontend tests.
 *
 * - Registers the @testing-library/jest-dom matchers on vitest's `expect`.
 * - Polyfills browser APIs that MUI relies on but jsdom does not implement.
 */
import { expect } from "vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import * as jestDomMatchers from "@testing-library/jest-dom/matchers";
import type { TestingLibraryMatchers } from "@testing-library/jest-dom/types/matchers";

// Augment vitest's `expect` with the jest-dom matchers (type level). The
// `any` type arguments mirror @testing-library/jest-dom's own vitest
// declaration (types/vitest.d.ts).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare module "vitest" {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  interface Assertion<T = any> extends TestingLibraryMatchers<any, T> {}
  interface AsymmetricMatchersContaining
    extends TestingLibraryMatchers<any, any> {}
  /* eslint-enable @typescript-eslint/no-explicit-any */
}

// Runtime registration of the same matchers. (The `@testing-library/jest-dom/vitest`
// entry cannot be used here: the repo type-checks with `moduleResolution: node`,
// which ignores package `exports` maps, and the pnpm store layout cannot resolve
// the entry's own `import 'vitest'`.)
expect.extend(jestDomMatchers);

// vitest globals are disabled, so React Testing Library cannot register its
// automatic DOM cleanup via the global afterEach - do it explicitly.
afterEach(() => {
  cleanup();
});

// `window.matchMedia` is used by MUI responsive helpers; jsdom has none.
if (!window.matchMedia) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => undefined, // deprecated API, still probed by MUI
      removeListener: () => undefined, // deprecated API, still probed by MUI
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }),
  });
}

// MUI popovers/tooltips observe layout; jsdom has no ResizeObserver.
if (!window.ResizeObserver) {
  class ResizeObserverStub {
    observe() {
      return undefined;
    }
    unobserve() {
      return undefined;
    }
    disconnect() {
      return undefined;
    }
  }
  Object.defineProperty(window, "ResizeObserver", {
    writable: true,
    value: ResizeObserverStub,
  });
}
