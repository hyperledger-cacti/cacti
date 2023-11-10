//  OpenAPI 3.0 supports get, post, put, patch, delete, head, options, and trace.
export const OPEN_API_V3_SUPPORTED_HTTP_VERBS = [
  "get",
  "post",
  "put",
  "patch",
  "delete",
  "head",
  "options",
  "trace",
] as const;

export type OPEN_API_V3_SUPPORTED_HTTP_VERB =
  (typeof OPEN_API_V3_SUPPORTED_HTTP_VERBS)[number];

export function isOpenApiV3SupportedHttpVerb(
  x: unknown,
): x is OPEN_API_V3_SUPPORTED_HTTP_VERB {
  return (
    typeof x === "string" &&
    OPEN_API_V3_SUPPORTED_HTTP_VERBS.includes(
      x as OPEN_API_V3_SUPPORTED_HTTP_VERB,
    )
  );
}
