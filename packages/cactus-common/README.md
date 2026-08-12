# `@hyperledger-cacti/cactus-common`

> Universal library used by both front end and back end components of Cactus. Aims to be a developer swiss army knife.

## Overview

This module is a universal utility library used by both front-end and back-end Cacti components. It provides a wide range of shared functionalities to facilitate consistent logging, validation, cryptographic operations, error handling, and HTTP utilities across the project.

**Target Audience:**
- [x] Developers
- [ ] Operators

## Install

```sh
npm install @hyperledger-cacti/cactus-common
```

## API Summary

### Logging
- `LoggerProvider`
- `Logger`
- `ILoggerOptions`
- `LogLevel`
- `LogLevelNumbers`
- `LogLevelDesc`

### Validation & Guards
- `Objects`
- `Strings`
- `Bools`
- `Checks`
- `isRecord`
- `hasKey`

### Cryptography
- `JsObjectSigner`
- `IJsObjectSignerOptions`
- `SignatureFunction`
- `VerifySignatureFunction`
- `HashFunction`
- `ISignerKeyPair`
- `Secp256k1Keys`
- `KeyFormat`
- `KeyConverter`
- `IJoseFittingJwtParams`
- `isIJoseFittingJwtParams`

### Error Handling
- `CodedError`
- `safeStringifyException`
- `asError`
- `coerceUnknownToError`
- `createRuntimeErrorWithCause`
- `newRex`
- `ErrorFromUnknownThrowable`
- `ErrorFromSymbol`

### HTTP Utilities
- `Http405NotAllowedError`
- `ALL_EXPRESS_HTTP_VERB_METHOD_NAMES`
- `ExpressHttpVerbMethodName`
- `isExpressHttpVerbMethodName`
- `isGrpcStatusObjectWithCode`
- `HttpHeader`
- `bigIntToDecimalStringReplacer`
- `IAsyncProvider`

## Usage

```typescript
import { LoggerProvider, LogLevelDesc } from "@hyperledger-cacti/cactus-common";

const log = LoggerProvider.getOrCreate({
  label: "my-service",
  level: "INFO" as LogLevelDesc,
});

log.info("Service initialized successfully.");
```

## Testing

To run the tests for this package, execute the following command from the package root:

```sh
npx jest
```
