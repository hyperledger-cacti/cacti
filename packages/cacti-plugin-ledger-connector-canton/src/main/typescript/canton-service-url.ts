/**
 * Validates a Canton service URL that may receive a credential.
 *
 * HTTPS is mandatory in production. Plain HTTP is available only for an
 * explicitly enabled loopback development service such as Canton LocalNet.
 */
export function validateCantonServiceUrl(
  value: unknown,
  allowInsecureLoopbackHttp: boolean,
  fieldName: string,
): string {
  if (
    !(value instanceof URL) &&
    (typeof value !== "string" || value.trim().length === 0)
  ) {
    throw new Error(`${fieldName} must be a non-blank URL`);
  }

  let url: URL;
  try {
    url = new URL(value instanceof URL ? value.href : value);
  } catch (_error: unknown) {
    throw new Error(`${fieldName} must be an absolute URL`);
  }

  if (url.username || url.password) {
    throw new Error(
      `${fieldName} must not embed credentials; configure options.auth instead`,
    );
  }
  if (url.protocol === "https:") {
    return url.href;
  }
  if (
    url.protocol !== "http:" ||
    !allowInsecureLoopbackHttp ||
    !isLoopbackHostname(url.hostname)
  ) {
    throw new Error(
      `${fieldName} must use https:; plain http: is only allowed for a loopback host with options.allowInsecureLoopbackHttp`,
    );
  }
  return url.href;
}

function isLoopbackHostname(hostname: string): boolean {
  // The URL parser normalizes IPv4 shorthands such as 127.1 and keeps
  // IPv6 literals in brackets.
  return (
    hostname === "localhost" ||
    hostname === "[::1]" ||
    /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)
  );
}
