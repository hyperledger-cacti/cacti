import { Checks } from "./checks";

export class Strings {
  public static replaceAll(
    source: string,
    searchValue: string,
    replaceValue: string
  ): string {
    return source.replace(new RegExp(searchValue, "gm"), replaceValue);
  }

  public static isString(val: any): boolean {
    return typeof val === "string" || val instanceof String;
  }

  public static dropNonPrintable(val: string): string {
    const fnTag = "Strings#dropNonPrintable()";
    Checks.truthy(Strings.isString(val), `${fnTag} Strings.isString(val)`);
    return val.replace(/[^ -~]+/g, "");
  }
}
