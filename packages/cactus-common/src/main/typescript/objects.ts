/**
 * Utility class responsible for common and tedious tasks involving Javascript objects (instances of classes).
 */
export class Objects {
  /**
   * Returns a list of methods for an instance, including the inherited ones.
   * Example:
   *
   * ```javascript
   * class Base {
   *   constructor() {
   *   }
   *   getX() {
   *     return 'x';
   *   }
   * }
   *
   * class A extends Base {
   *   getA() {
   *     return 'a';
   *   }
   * }
   *
   * const a = new A();
   * const methodNames = Objects.getAllMethodNames(a);
   * console.log(methodNames);
   * // [ 'getA', 'getX' ]
   * ```
   *
   * @param anObject
   */
  public static getAllMethodNames(anObject: unknown): string[] {
    let aRecord = anObject as Readonly<Record<string, unknown>>;
    let properties: string[] = [];
    do {
      const symbols = Object.getOwnPropertySymbols(aRecord);
      const symbolPropertyNames = symbols.map((aSymbol) => aSymbol.toString());

      const propertyNamesCurrent = Object.getOwnPropertyNames(aRecord)
        .concat(symbolPropertyNames)
        .sort()
        .filter((propertyName: string, index: number, arr) => {
          return (
            typeof aRecord[propertyName] === "function" &&
            propertyName !== "constructor" &&
            (index === 0 || propertyName !== arr[index - 1]) &&
            properties.indexOf(propertyName) === -1
          );
        });

      properties = properties.concat(propertyNamesCurrent);
      aRecord = Object.getPrototypeOf(aRecord);
    } while (aRecord && Object.getPrototypeOf(aRecord));
    return properties;
  }

  public static getAllFieldNames(anObject: Record<string, unknown>): string[] {
    const allFieldNames = [];
    for (const propertyKey in anObject) {
      if (Object.prototype.hasOwnProperty.call(anObject, propertyKey)) {
        allFieldNames.push(propertyKey);
      }
    }
    return allFieldNames;
  }
}
