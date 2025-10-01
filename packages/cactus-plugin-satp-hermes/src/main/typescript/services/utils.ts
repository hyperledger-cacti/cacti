export function getEnumKeyByValue<T extends object>(
  enumObj: T,
  value: number,
): string | undefined {
  return Object.keys(enumObj).find((key) => enumObj[key as keyof T] === value);
}
export function getEnumValueByKey<T extends object>(
  enumObj: T,
  key: string,
): number | undefined {
  return enumObj[key as keyof T] as unknown as number;
}
