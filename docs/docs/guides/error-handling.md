# Error Handling Guidelines for Contributors

This document outlines the guidelines for handling errors in REST endpoints within the project. Proper error handling is crucial for providing clear feedback to API consumers and for maintaining the stability and debuggability of the system.

## Philosophy

*   **Client Errors (4xx):** These indicate that the client has sent a bad request. The client should modify their request and try again. Examples include invalid input, missing parameters, or unauthorized access.
*   **Server Errors (5xx):** These indicate that something went wrong on the server's side while processing a valid request. The client should typically retry the request later, or report the issue to the developers.

## Using `http-errors` Library

The project utilizes the `http-errors` library (and `http-errors-enhanced-cjs` for status code identifiers) to standardize HTTP error responses. This library allows you to create `HttpError` instances that carry both a status code and a message, which are then correctly processed by the `handleRestEndpointException` utility.

### When to use `createHttpError` (for 4xx Client Errors)

Always use `throw createHttpError(statusCode, message)` when an error originates from invalid client input or a client-side condition that prevents successful processing. This ensures that the client receives an appropriate 4xx status code and a descriptive message.

**Examples of common 4xx errors and when to use them:**

*   **`400 Bad Request`**: The server cannot or will not process the request due to something that is perceived to be a client error (e.g., malformed request syntax, invalid request message framing, or deceptive request routing).
    *   *Example:* Invalid format for a request body parameter (e.g., a non-numeric string where a number is expected).
    *   *Code Example:*
        ```typescript
        import createHttpError from "http-errors";

        // ... inside an endpoint handler
        const amountNum = parseInt(reqBody.amount);
        if (isNaN(amountNum)) {
          throw createHttpError(400, "Invalid amount provided. Must be a number.");
        }
        ```
*   **`401 Unauthorized`**: The client must authenticate itself to get the requested response. (Note: 401 means "unauthenticated".)
    *   *Example:* A request without a valid authentication token.
*   **`403 Forbidden`**: The client does not have access rights to the content, i.e., it is unauthorized, so the server is refusing to give the requested response. Unlike 401, a client's authentication will make no difference.
    *   *Example:* An authenticated user trying to access a resource they do not have permissions for.
*   **`404 Not Found`**: The server cannot find the requested resource.
    *   *Example:* Requesting data for an entity ID that does not exist in the system.
*   **`409 Conflict`**: Indicates a request conflict with the current state of the target resource.
    *   *Example:* Attempting to create a resource that already exists with a unique identifier.
*   **`422 Unprocessable Entity`**: The request was well-formed but was unable to be followed due to semantic errors.
    *   *Example:* Validation errors where the data structure is correct but the values are logically invalid (e.g., a date in the past for a future appointment).

### When to allow default 500 (Internal Server Error)

If an exception occurs that is *not* an `HttpError` instance, the `handleRestEndpointException` utility will automatically catch it and return a `500 Internal Server Error`. This behavior is desired for:

*   **Unhandled System Errors:** Unexpected issues within the server logic, database errors, integration failures with external services, or other unforeseen problems that are not directly caused by client input.
*   **Programmatic Bugs:** Errors that indicate a fault in the server's code itself.

**Important:** Do **not** manually throw `createHttpError(500, ...)` unless you are intentionally creating a generic internal server error for a specific, known scenario (which is rare). Let unhandled exceptions fall through to `handleRestEndpointException` to be converted to `500`s.

### Logging within `handleRestEndpointException`

The `handleRestEndpointException` function handles logging differently based on the error type:

*   **5xx Errors (Internal Server Errors):** These are logged at the `error` level to ensure immediate visibility for developers, as they indicate critical issues that need to be addressed.
*   **4xx Errors (Client Errors):** These are logged at the `debug` level. While they represent client mistakes, logging them as errors would clutter logs with non-critical issues. `debug` level provides visibility for troubleshooting client-side integration problems without triggering alerts for server-side stability.

### Best Practices

*   **Validate Early:** Perform input validation as early as possible in your endpoint handlers.
*   **Specific Errors:** Strive to return the most specific 4xx status code possible. Avoid always defaulting to `400 Bad Request` if a more precise code like `404 Not Found` or `401 Unauthorized` is applicable.
*   **Meaningful Messages:** Provide clear, concise, and actionable error messages in your `createHttpError` calls. These messages are returned to the client.
*   **Avoid Leaking Information:** For `500 Internal Server Errors`, ensure that sensitive internal details (stack traces, database queries, API keys) are not exposed to the client. The `handleRestEndpointException` utility already sanitizes exceptions by default.
*   **Test Error Paths:** Write tests that explicitly verify both 4xx and 5xx error scenarios to ensure your error handling works as expected.
