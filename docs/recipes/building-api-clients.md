<!-- --8<-- [start:content] -->
# Build API Clients

This guide explains how API clients are automatically generated and compiled within the Hyperledger Cacti ecosystem.

## Prerequisites
- A working Cacti development environment.
- A successful execution of `yarn configure`.

## Steps

1. **Understand the generation process**
   You do not need to perform any manual steps to have the API Client sources generated and compiled. The API client code is automatically generated from the respective `openapi.json` file of each package that exposes web services (e.g., REST, SocketIO, gRPC). 
   
2. **Review the core client package**
   There is a dedicated `@hyperledger-cacti/cactus-api-client` package that contains common functionality shared across all API clients. This serves as a foundation, functioning similarly to abstract classes for sub-class implementations.

3. **Build the backend**
   The generation and compilation process is handled as part of the backend build task. You can trigger this manually or rely on the CI script:
   ```bash
   npm run build:dev:backend
   ```
   Alternatively, you can run the CI script:
   ```bash
   ./tools/ci.sh
   ```

4. **Verify the generated code**
   Each `openapi.json` file produces its own API client via the code generator. These clients include relevant model definitions, such as interfaces describing the request and response bodies for all possible operations, as well as validation constraints.

## Expected Outcome
API clients are automatically built and compiled, running seamlessly in both browser and NodeJS environments without maintaining separate codebases.

## Related
- [Contributing Guidelines][contributing]
- [Conventions][conventions]
- [Managing Dependencies][managing-dependencies]

<!-- --8<-- [end:content] -->

[contributing]: ../../CONTRIBUTING.md
[conventions]: ../../CONVENTIONS.md
[managing-dependencies]: ./managing-dependencies.md
