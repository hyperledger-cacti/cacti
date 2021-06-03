import { Bools } from "@hyperledger/cactus-common";

export interface IEndpointAuthzOptions {
  /**
   * Holds a list of strings that can be interpreted by the authorization
   * implementation (whatever may that be) for the purposes of deciding which
   * user identity can and cannot invoke this endpoint.
   * For example if your authorization layer is using the OAuth2 protocol then
   * this could be set to an array of scope names that will be mandated
   * to be present on the user identity.
   *
   * If your endpoint is designed to be non-secure and does not need authN/authZ
   * then this can contain an empty list of strings, no problem.
   *
   * @see {#isProtected}
   */
  requiredRoles: string[];
  /**
   * The boolean indicating whether callers of this endpoint need to
   * be authenticated or not.
   * If this property is set to false that means that the API server will let anyone
   * call this endpoint without them needing to present an identity at all.
   * It is very important to have a default value of `true` for this in your
   * code (when in doubt) so that the **Secure by default** design principle
   * of Cactus is upheld as much as possible.
   */
  isProtected: boolean;
}

export function isIEndpointAuthzOptions(
  x: unknown,
): x is IEndpointAuthzOptions {
  return (
    !!x &&
    Array.isArray((x as IEndpointAuthzOptions)?.requiredRoles) &&
    Bools.isBooleanStrict((x as IEndpointAuthzOptions)?.isProtected)
  );
}
