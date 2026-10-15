/**
 * Add application path to route path where applicable.
 *
 * Example: "blocks" route under "eth" app will create a path /eth/blocks
 */
export function patchAppRoutePath(appPath: string, routePath?: string) {
  // Add missing '/' to front of app path if necessary
  appPath = appPath.startsWith("/") ? appPath : `/${appPath}`;

  if (routePath && routePath !== "/") {
    // Remove additionall '/' from route to create nice concat
    routePath = routePath.startsWith("/") ? routePath.slice(1) : routePath;
    return `${appPath}/${routePath}`;
  } else {
    return appPath;
  }
}

/**
 * Returns true if provided url is defined and valid, returns false and
 * writes error to `console.error` otherwise.
 */
export function isValidUrl(urlString?: string) {
  if (!urlString) {
    return false;
  }

  try {
    new URL(urlString);
    return true;
  } catch (e) {
    console.error(`Invalid URL provided: ${urlString}, error: ${e}`);
    return false;
  }
}

/**
 * Characters that make a URL unacceptable for fetch-style endpoints even
 * though the WHATWG URL parser would silently accept (parts of) them:
 *
 * - C0 control characters, DEL and the plain space: the parser strips
 *   leading/trailing control-or-space characters and removes embedded
 *   tab/newline anywhere (`"https://host\\t:4010"` would parse as
 *   `https://host:4010`), which would launder whitespace-spoofed input
 *   instead of rejecting it;
 * - backslashes: WHATWG treats `\\` as `/` inside special schemes
 *   (`https:\\\\host` parses with `host` as the authority), hiding the real
 *   host/path boundary from anything that inspects the raw string;
 * - non-ASCII characters (IDN/homoglyph policy): unicode hosts get
 *   punycode-mapped by the parser, so a homoglyph host such as
 *   `gаteway.example.com` (Cyrillic `а`) silently resolves to a different
 *   xn-- domain. Operator-entered endpoints must be ASCII; international
 *   hosts remain reachable through their punycode (`xn--...`) form.
 */
// cspell:ignore gаteway -- intentional Cyrillic-а homoglyph example below
// eslint-disable-next-line no-control-regex -- rejecting control characters is exactly the point
const FORBIDDEN_URL_CHARS = /[\u0000-\u0020\\\u007F-\uFFFF]/;

/**
 * Strict variant of {@link isValidUrl} for URLs that the browser will
 * actually fetch (app instance endpoints such as gateway or Prometheus
 * URLs): the string must parse as an absolute URL AND use a hypertext
 * scheme. Rejects non-`http:`/`https:` schemes (e.g. `file:`, `javascript:`,
 * `data:`) and relative or scheme-less URLs, and - unlike {@link isValidUrl}
 * - stays silent (callers use the boolean result for user-facing errors).
 *
 * Additional post-parse policies (documented, fuzz-tested in
 * `src/test/typescript/vitest/satp-app-definition.test.tsx`):
 *
 * - **Embedded credentials are rejected** (`https://user:pass@host`): basic
 *   auth in a URL leaks secrets into console logs, browser history and
 *   error messages, and app options are plain JSON rows in the config
 *   store. Auth must be configured out of band, not in the endpoint URL.
 * - **Whitespace/control characters are rejected** even where the URL
 *   parser would trim them (see {@link FORBIDDEN_URL_CHARS}).
 * - **Backslashes are rejected** (see {@link FORBIDDEN_URL_CHARS}).
 * - **Non-ASCII / IDN homoglyphs are rejected**; ASCII punycode (`xn--`)
 *   hosts are accepted (see {@link FORBIDDEN_URL_CHARS}).
 * - **Ports**: out-of-range ports (e.g. `:99999`) fail URL parsing and are
 *   rejected; leading-zero ports (`:04010`) parse and are accepted with
 *   their normalized value (`:4010`) - harmless, the parser owns the
 *   semantics. Protocol-relative URLs (`//host`) have no scheme and fail
 *   parsing without a base URL, so they are rejected.
 */
export function isHttpUrl(urlString?: string): boolean {
  if (!urlString) {
    return false;
  }

  if (FORBIDDEN_URL_CHARS.test(urlString)) {
    return false;
  }

  let parsed: URL;
  try {
    parsed = new URL(urlString);
  } catch {
    return false;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return false;
  }
  // Credentials policy: reject embedded basic-auth userinfo regardless of
  // scheme validity (see doc comment above).
  if (parsed.username !== "" || parsed.password !== "") {
    return false;
  }
  return true;
}
