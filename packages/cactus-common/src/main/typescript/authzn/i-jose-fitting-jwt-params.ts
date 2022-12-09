/**
 * This interface is defined as the lowest common denominator between
 * two different types that libraries use that are related to each other.
 * The libraries are: `jose` and `express-jwt`.
 *
 * Why though?
 * We need this because when we are using `jose` to sign a JWT payload,
 * we are extracting the parameters from a `Params` typed object (which
 * is defined as a type by `express-jwt`) and the two have certain
 * incompatibilities by default that would either force us to do
 * unsafe casts or (the better solution) to do runtime checks. Said
 * runtime checks is what this interface is powering through a user-
 * defined type-guard.
 *
 * The list of properties on this interface is incomplete, but that is
 * by design because we just want to use it to check whether objects
 * are compliant or not with the expectations of the `jose` library for
 * JWT signing.
 *
 * @link https://www.npmjs.com/package/express-jwt
 * @link https://www.npmjs.com/package/jose
 * @link https://www.rfc-editor.org/rfc/rfc7519
 */
export interface IJoseFittingJwtParams {
  [key: string]: unknown;
  readonly issuer: string;
  readonly audience: string;
}

/**
 * User defined type-guard to check/enforce at runtime if an object has
 * the shape it needs to for it to be used by the `jose` library for
 * parameters to a JWT signing operation.
 *
 * @param x Literally anything, ideally a IJoseFittingJwtParams shaped
 * object.
 * @returns Whether x is conformant (at runtime) to the expected type.
 */
export function isIJoseFittingJwtParams(
  x: unknown,
): x is IJoseFittingJwtParams {
  return true;
}
