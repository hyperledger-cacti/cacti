# `@hyperledger/cactus-common`

Universal utility library shared by both the front-end and back-end components of Cacti. Acts as a developer "swiss army knife" for the rest of the monorepo.

## Summary

`cactus-common` is a low-level dependency consumed by virtually every other Cacti package. It exposes small, focused helpers in the following areas:

- **Logging** — `LoggerProvider`, `Logger`, log levels.
- **Type guards & primitives** — `Strings`, `Bools`, `Objects`, `Checks`, `isRecord`, `hasKey`.
- **Errors** — `CodedError`, `safeStringifyException`, `createRuntimeErrorWithCause` / `newRex`, `coerceUnknownToError`, `ErrorFromUnknownThrowable`, `ErrorFromSymbol`.
- **Crypto** — `JsObjectSigner`, `Secp256k1Keys`, `KeyConverter`, `KeyFormat`.
- **HTTP** — `HttpHeader`, HTTP status code errors, `ExpressHttpVerbMethodName`.
- **gRPC** — `isGrpcStatusObjectWithCode`.
- **Serde** — `bigIntToDecimalStringReplacer` and friends for safe `BigInt` JSON.
- **JOSE / JWT** — `IJoseFittingJwtParams`, `isIJoseFittingJwtParams`.

The full surface lives in [`src/main/typescript/public-api.ts`](./src/main/typescript/public-api.ts).

## Installation

```sh
yarn add @hyperledger/cactus-common
# or
npm install @hyperledger/cactus-common
```

## Usage

```typescript
import {
  Checks,
  LoggerProvider,
  Strings,
  newRex,
} from "@hyperledger/cactus-common";

const log = LoggerProvider.getOrCreate({ label: "my-component", level: "INFO" });

function greet(name: string): string {
  Checks.nonBlankString(name, "name");
  return `Hello, ${Strings.dropNonPrintable(name)}!`;
}

try {
  log.info(greet("alice"));
} catch (cause) {
  throw newRex("greet failed", cause);
}
```

## Running tests

From the repository root:

```sh
yarn lerna run test --scope=@hyperledger/cactus-common
```

## References

- Public API surface: [`src/main/typescript/public-api.ts`](./src/main/typescript/public-api.ts)
- [Cacti core API](https://github.com/hyperledger-cacti/cacti/tree/main/packages/cactus-core-api)
