import safeStringify from "fast-safe-stringify";
import sanitizeHtml from "sanitize-html";

/**
 * Utility class for better exception handling by way of having a code property
 * which is designated to uniquely identify the type of exception that was
 * thrown, essentially acting as a discriminator property.
 */
export class CodedError extends Error {
  constructor(
    public readonly message: string,
    public readonly code: string,
  ) {
    super(message);
  }

  sameCode(codedError: CodedError): boolean {
    return this.code === codedError?.code;
  }
}

/**
 * Return secure string representation of error from the input.
 * Handles circular structures and removes HTML.
 *
 * @param error Any object to return as an error, preferable `Error`
 * @returns Safe string representation of an error.
 */
export function safeStringifyException(error: unknown): string {
  // Axios and possibly other lib errors produce nicer output with toJSON() method.
  // Use it if available
  if (
    error &&
    typeof error === "object" &&
    "toJSON" in error &&
    typeof error.toJSON === "function"
  ) {
    return sanitizeHtml(safeStringify(error.toJSON()));
  }

  if (error instanceof Error) {
    return sanitizeHtml(error.stack || error.message);
  }

  return sanitizeHtml(safeStringify(error));
}
