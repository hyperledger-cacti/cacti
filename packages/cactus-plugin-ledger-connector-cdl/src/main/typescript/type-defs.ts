import {
  AuthInfoAccessTokenV1,
  AuthInfoSubscriptionKeyV1,
  AuthInfoV1,
} from "./public-api";

// CDL specific header names
export const HTTP_HEADER_SUBSCRIPTION_KEY = "Ocp-Apim-Subscription-Key";
export const HTTP_HEADER_TRUST_USER_ID = "Trust-User-Id";
export const HTTP_HEADER_TRUST_USER_ROLE = "Trust-User-Role";
export const HTTP_HEADER_TRUST_AGENT_ID = "Trust-Agent-Id";
export const HTTP_HEADER_TRUST_AGENT_ROLE = "Trust-Agent-Role";

export type HTTPAuthHeadersType = Record<string, string | number | boolean>;

/**
 * Get HTTP request headers based on `AuthInfoV1` provided by the user.
 * Will throw if mixed / invalid authInfo was provided.
 *
 * @param authInfo authentication data
 * @returns object with headers and their values
 */
export function getAuthorizationHeaders(
  authInfo: AuthInfoV1,
): HTTPAuthHeadersType {
  if (
    isAuthInfoAccessTokenV1(authInfo) &&
    isAuthInfoSubscriptionKeyV1(authInfo)
  ) {
    throw new Error(
      "Mixed authInfo configuration detected - use either accessToken or subscriptionKey!",
    );
  }

  if (isAuthInfoAccessTokenV1(authInfo)) {
    return {
      Authorization: `Bearer ${authInfo.accessToken}`,
      [HTTP_HEADER_TRUST_AGENT_ID]: authInfo.trustAgentId,
    };
  } else if (isAuthInfoSubscriptionKeyV1(authInfo)) {
    return {
      [HTTP_HEADER_SUBSCRIPTION_KEY]: authInfo.subscriptionKey,
      [HTTP_HEADER_TRUST_USER_ID]: authInfo.trustUserId,
      [HTTP_HEADER_TRUST_USER_ROLE]: authInfo.trustUserRole,
      [HTTP_HEADER_TRUST_AGENT_ID]: authInfo.trustAgentId,
      [HTTP_HEADER_TRUST_AGENT_ROLE]: authInfo.trustAgentRole,
    };
  } else {
    throw new Error(
      "Missing authInfo information or information not complete!",
    );
  }
}

/**
 * True if provided argument is of `AuthInfoAccessTokenV1` type.
 * Use for type narrowing.
 */
export function isAuthInfoAccessTokenV1(
  authInfo: AuthInfoV1,
): authInfo is AuthInfoAccessTokenV1 {
  const typedAuthInfo = authInfo as AuthInfoAccessTokenV1;
  return (
    typedAuthInfo &&
    typeof typedAuthInfo.accessToken !== "undefined" &&
    typeof typedAuthInfo.trustAgentId !== "undefined"
  );
}

/**
 * True if provided argument is of `AuthInfoSubscriptionKeyV1` type.
 * Use for type narrowing.
 */
export function isAuthInfoSubscriptionKeyV1(
  authInfo: AuthInfoV1,
): authInfo is AuthInfoSubscriptionKeyV1 {
  const typedAuthInfo = authInfo as AuthInfoSubscriptionKeyV1;
  return (
    typedAuthInfo &&
    typeof typedAuthInfo.subscriptionKey !== "undefined" &&
    typeof typedAuthInfo.trustAgentId !== "undefined" &&
    typeof typedAuthInfo.trustAgentRole !== "undefined" &&
    typeof typedAuthInfo.trustUserId !== "undefined" &&
    typeof typedAuthInfo.trustUserRole !== "undefined"
  );
}
