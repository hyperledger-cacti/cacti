import { Checks } from "@hyperledger/cactus-common";

const PATTERN_FABRIC_CORE_LOGGING_LEVEL = new RegExp(
  `\\s+(-e|--env)\\s+CORE_LOGGING_LEVEL='?"?\\w+'?"?\\s+`,
  "gmi",
);

const PATTERN_FABRIC_LOGGING_SPEC = new RegExp(
  `FABRIC_LOGGING_SPEC=('?"?\\w+'?"?)`,
  "gmi",
);

export function findAndReplaceFabricLoggingSpec(
  input: string,
  newLogLevel: string,
): string {
  Checks.nonBlankString(input, `findAndReplaceFabricLoggingSpec() arg1`);
  Checks.nonBlankString(newLogLevel, `findAndReplaceFabricLoggingSpec() arg2`);
  return input
    .replace(PATTERN_FABRIC_CORE_LOGGING_LEVEL, " ")
    .replace(
      PATTERN_FABRIC_LOGGING_SPEC,
      " FABRIC_LOGGING_SPEC= ".concat(newLogLevel),
    );
}
