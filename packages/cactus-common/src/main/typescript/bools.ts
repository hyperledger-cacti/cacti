export class Bools {
  /**
   * Determines if a value is strictly a boolean `true` or `false`. Anything else
   * will result in the method returning `false`.
   *
   * Useful in cases where you have an optional boolean parameter that you need
   * to assign a default value to by determining if it had been set or not.
   *
   * @param val The value to be decided on whether it's strictly boolean `true`
   * or `false`.
   */
  public static isBooleanStrict(val: unknown): boolean {
    return val === true || val === false;
  }
}
