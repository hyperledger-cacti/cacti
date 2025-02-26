export function getEnumKeyByValue<T extends object>(
  enumObj: T,
  value: number,
): string | undefined {
  return Object.keys(enumObj).find((key) => enumObj[key as keyof T] === value);
}
