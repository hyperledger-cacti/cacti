/**
 * Canton error code returned when an active-contract query matches more
 * contracts than the participant's `http-list-max-elements-limit` allows.
 */
export const CANTON_LIST_LIMIT_ERROR_CODE =
  "JSON_API_MAXIMUM_LIST_ELEMENTS_NUMBER_REACHED";

/**
 * A Canton ledger rejection translated into an HTTP status. Only the status,
 * a fixed message, and Canton's constant error code are kept. The ledger's
 * `cause`, `context`, and `resources` can contain party, contract, or
 * credential data and are deliberately dropped.
 */
export class CantonLedgerError extends Error {
  public readonly name = "CantonLedgerError";

  public constructor(
    public readonly statusCode: number,
    message: string,
    public readonly cantonErrorCode: string,
  ) {
    super(message);
  }
}

interface IJsCantonErrorLike {
  readonly code: string;
  readonly errorCategory: number;
  readonly grpcCodeValue?: number;
}

/** Canton error codes are upper-case identifiers such as DUPLICATE_COMMAND. */
const CANTON_ERROR_CODE_PATTERN = /^[A-Z][A-Z0-9_]{0,127}$/;

function isJsCantonError(error: unknown): error is IJsCantonErrorLike {
  if (typeof error !== "object" || error === null) {
    return false;
  }
  const candidate = error as Record<string, unknown>;
  return (
    typeof candidate.code === "string" &&
    CANTON_ERROR_CODE_PATTERN.test(candidate.code) &&
    typeof candidate.errorCategory === "number" &&
    (candidate.grpcCodeValue === undefined ||
      typeof candidate.grpcCodeValue === "number")
  );
}

// gRPC status codes reported by Canton in JsCantonError.grpcCodeValue.
const GRPC_INVALID_ARGUMENT = 3;
const GRPC_DEADLINE_EXCEEDED = 4;
const GRPC_NOT_FOUND = 5;
const GRPC_ALREADY_EXISTS = 6;
const GRPC_PERMISSION_DENIED = 7;
const GRPC_RESOURCE_EXHAUSTED = 8;
const GRPC_FAILED_PRECONDITION = 9;
const GRPC_ABORTED = 10;
const GRPC_OUT_OF_RANGE = 11;
const GRPC_UNAVAILABLE = 14;
const GRPC_UNAUTHENTICATED = 16;

/**
 * Converts a Canton JSON Ledger API error into a {@link CantonLedgerError}.
 * Any other value is returned unchanged so that the endpoint error handler
 * reports it as an opaque upstream failure.
 */
export function toCantonLedgerError(
  error: unknown,
  outcomeMayBeUnknown: boolean,
): unknown {
  if (!isJsCantonError(error)) {
    return error;
  }
  const code = error.code;
  if (code === CANTON_LIST_LIMIT_ERROR_CODE) {
    return new CantonLedgerError(
      413,
      "More active contracts match than the Canton participant returns in one response. Narrow the filters or lower the limit.",
      code,
    );
  }
  switch (error.grpcCodeValue) {
    case GRPC_INVALID_ARGUMENT:
      return new CantonLedgerError(
        400,
        "The Canton ledger rejected the request as invalid.",
        code,
      );
    case GRPC_OUT_OF_RANGE:
      return new CantonLedgerError(
        400,
        "The request refers to a ledger offset that is out of range.",
        code,
      );
    case GRPC_PERMISSION_DENIED:
      return new CantonLedgerError(
        403,
        "The Canton ledger denied permission for the request.",
        code,
      );
    case GRPC_NOT_FOUND:
      return new CantonLedgerError(
        404,
        "A Canton resource referenced by the request was not found.",
        code,
      );
    case GRPC_ALREADY_EXISTS:
      return new CantonLedgerError(
        409,
        "The Canton ledger already has this change, for example a command with the same commandId.",
        code,
      );
    case GRPC_FAILED_PRECONDITION:
      return new CantonLedgerError(
        409,
        "The request conflicts with the current Canton ledger state.",
        code,
      );
    case GRPC_ABORTED:
    case GRPC_RESOURCE_EXHAUSTED:
    case GRPC_UNAVAILABLE:
      return new CantonLedgerError(
        503,
        "The Canton ledger is temporarily unable to process the request. Retry later; reuse the same commandId when retrying a transaction.",
        code,
      );
    case GRPC_DEADLINE_EXCEEDED:
      return new CantonLedgerError(
        504,
        outcomeMayBeUnknown
          ? "The Canton ledger timed out; the final transaction outcome is unknown."
          : "The Canton ledger timed out.",
        code,
      );
    case GRPC_UNAUTHENTICATED:
      return new CantonLedgerError(
        502,
        "The Canton ledger rejected the connector's credentials.",
        code,
      );
    default:
      return new CantonLedgerError(
        502,
        "Canton ledger operation failed.",
        code,
      );
  }
}
