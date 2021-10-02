/**
 * Determines if a given `propertyKey` is present within `anObject`.
 *
 * @param anObject The object to check the presence of `propertyKey` for.
 * @param propertyKey The key whose presence will be checked.
 */
export function hasProperty<T extends PropertyKey>(
  anObject: unknown,
  propertyKey: T,
): anObject is Record<T, unknown> {
  if (typeof anObject !== "object") {
    return false;
  }
  if (!anObject) {
    return false;
  }
  return propertyKey in anObject;
}
