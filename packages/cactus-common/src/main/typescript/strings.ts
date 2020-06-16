export class Strings {
  public static replaceAll(
    source: string,
    searchValue: string,
    replaceValue: string
  ): string {
    return source.replace(new RegExp(searchValue, "gm"), replaceValue);
  }
}
