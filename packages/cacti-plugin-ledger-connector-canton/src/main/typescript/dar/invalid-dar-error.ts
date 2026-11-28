/**
 * The supplied bytes are not a DAR the connector can deploy. Messages are
 * fixed strings written by the connector, so they are safe to return to the
 * caller; they never contain archive contents.
 */
export class InvalidDarError extends Error {
  public readonly name = "InvalidDarError";
}
