import { Logger } from "@hyperledger/cactus-common";

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

export interface chainConfigElement<T> {
  configElement: string;
  configElementType?: T | string;
  configElementTypeguard?:
    | ((value: unknown, log: Logger) => boolean)
    | ((value: unknown) => boolean);
  configSubElementType?: T;
  configSubElementFunctionTypeguard?:
    | ((value: unknown, log: Logger) => boolean)
    | ((value: unknown) => boolean);
}

export function identifyAndCheckConfigFormat<T>(
  configElements: chainConfigElement<T>[],
  obj: Record<string, any>,
  log: Logger,
  fnTag: string,
  optionalConfigElements: chainConfigElement<T>[] = [],
): boolean {
  if (configElements.length === 0) {
    log.error("No config elements where provided for validation.");
    return false;
  }

  /* Check if all obligatory elements for the config are present */
  for (const element of configElements) {
    if (!(element.configElement in obj)) {
      return false;
    }
  }

  /* Check if all obligatory elements are of the correct type */
  for (const element of configElements) {
    const check1 = checkConfigElementFormat(element, obj, log, fnTag);
    if (!check1) {
      return false;
    }
  }

  /* Check if all optional elements that are present are of the correct type */
  if (optionalConfigElements.length !== 0) {
    for (const element of optionalConfigElements) {
      const check2 = checkConfigElementFormat(
        element,
        obj,
        log,
        fnTag,
        element.configElement in obj,
      );
      if (!check2) {
        return false;
      }
    }
  }

  return true;
}

export function checkConfigElementFormat<T>(
  ccElement: chainConfigElement<T>,
  obj: Record<string, any>,
  log: Logger,
  fnTag: string,
  elementInConfig: boolean = true,
): boolean {
  if (elementInConfig) {
    if (!ccElement.configElementType && !ccElement.configElementTypeguard) {
      log.error(
        `${fnTag}: ${ccElement.configElement} provided with no corresponding way for typecheck`,
      );
      return false;
    }

    if (
      ccElement.configElementType &&
      typeof obj[ccElement.configElement] !== ccElement.configElementType
    ) {
      log.error(
        `${fnTag}: ${ccElement.configElement} present but not of type ${ccElement.configElementType}`,
      );
      return false;
    } else if (
      ccElement.configElementTypeguard &&
      !ccElement.configElementTypeguard(obj[ccElement.configElement], log)
    ) {
      log.error(
        `${fnTag}: ${ccElement.configElement} present but with invalid format`,
      );
      return false;
    } else {
      if (ccElement.configSubElementType) {
        obj[ccElement.configElement].forEach((subEl: unknown) => {
          if (
            typeof subEl !== ccElement.configSubElementType ||
            subEl === null
          ) {
            log.error(
              `${fnTag}: ${ccElement.configElement} is an array but contains invalid type elements`,
            );
            return false;
          }
        });
      } else if (ccElement.configSubElementFunctionTypeguard) {
        obj[ccElement.configElement].forEach((subEl: unknown) => {
          if (
            !ccElement.configSubElementFunctionTypeguard!(subEl, log) ||
            subEl === null
          ) {
            log.error(
              `${fnTag}: ${ccElement.configElement} is an array but contains invalid format elements`,
            );
            return false;
          }
        });
      } else {
        return true;
      }
    }
  }
  return true;
}
