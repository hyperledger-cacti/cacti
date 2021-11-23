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
  public static getAllMethodNames(anObject: any): string[] {
    let properties: string[] = [];
    do {
      const symbols = Object.getOwnPropertySymbols(anObject);
      const symbolPropertyNames = symbols.map((aSymbol) => aSymbol.toString());

      const propertyNamesCurrent = Object.getOwnPropertyNames(anObject)
        .concat(symbolPropertyNames)
        .sort()
        .filter((propertyName: string, index: number, arr) => {
          return (
            typeof anObject[propertyName] === "function" &&
            propertyName !== "constructor" &&
            (index === 0 || propertyName !== arr[index - 1]) &&
            properties.indexOf(propertyName) === -1
          );
        });

      properties = properties.concat(propertyNamesCurrent);
      anObject = Object.getPrototypeOf(anObject);
    } while (anObject && Object.getPrototypeOf(anObject));
    return properties;
  }

  public static getAllFieldNames(anObject: any): string[] {
    const allFieldNames = [];
    for (const propertyKey in anObject) {
      if (Object.prototype.hasOwnProperty.call(anObject, propertyKey)) {
        allFieldNames.push(propertyKey);
      }
    }
    return allFieldNames;
  }
}
