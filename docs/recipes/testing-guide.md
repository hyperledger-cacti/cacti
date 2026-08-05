<!-- --8<-- [start:content] -->
# Write and Run Tests

This guide outlines the principles and procedures for writing and executing test automation within the Hyperledger Cacti project. It covers testing patterns, file structures, and command-line execution details.

## Prerequisites

- A working Cacti build (see `BUILD.md`).
- Familiarity with Jest and TypeScript.

## Steps

### 1. Writing Tests

**Test Case Core Principles**

Test files must be located within the `src/test/` directory tree of their respective package to separate them from the production code. To avoid circular dependencies, testing components should often be kept in dedicated testing packages. 

When adding test-related tools or libraries, they should generally be added as `devDependencies` rather than `dependencies` (unless they are required at runtime). Ensure that your test code is completely excluded from the package's `public-api.ts`.

All test scenarios must support unlimited parallelism. They must not rely on shared global state or hardcoded resources (like specific fixed ports) that prevent them from running alongside other tests concurrently.

Furthermore, test cases within a package should not depend on code outside of the `src/*` folder (e.g. relying on compiled outputs from other packages in unexpected ways).

**TAP Compatibility**

Cacti tests are designed to be TAP (Test Anything Protocol) compatible. Here is a simple example of a test case:

```typescript
const test, { Test } = require("tape");
import * as publicApi from "../../../main/typescript/public-api";

test("Module can be loaded", (t: Test) => {
   t.ok(publicApi);
   t.end(); // yaay, test coverage
});
```

### 2. Design Patterns

**Architectural Testability and Dependency Injection**

One of the most important architectural considerations for testability is dependency injection. For example, if you have a class that depends on a shared resource, such as the file system or a network port open for TCP connections, you must avoid hardcoding these resources.

If your class hardcodes the port number, it might be functionally correct, but it will not allow for the customization of that port through a constructor or a setter method. Maintainers will require that the port can be customized at runtime. This allows test cases to pass in port `0` (which typically requests an available ephemeral port from the OS), making the test executable in parallel with other tests without becoming flaky.

### 3. Running Tests

Before attempting to run the tests, make sure that your build has succeeded.

**Running a single test case:**

- Integration test:
  ```bash
  yarn jest packages/cacti-plugin-consortium-static/src/test/typescript/integration/get-consortium-jws-endpoint.test.ts
  ```
- Unit test:
  ```bash
  npx jest packages/cactus-common/src/test/typescript/unit/objects/get-all-method-names.test.ts
  ```

**Running multiple test cases:**

- Running all test cases (unit + integration):
  ```bash
  npm run test:all
  ```
- Running unit tests only:
  ```bash
  npm run test:unit
  ```
- Running integration tests only:
  ```bash
  npm run test:integration
  ```

*Note on `npx` and Yarn:*
`npx` is a standard top-level binary placed on the path by NodeJS at installation time. We use it to avoid having to place every node module on the OS path or installing them globally. The equivalent for Yarn is running `yarn` directly. For example, `npx lerna clean` becomes `yarn lerna clean`.

### 4. Debugging Tests

For instructions on debugging your test cases directly within Visual Studio Code, refer to the VS Code setup recipe.

## Expected Outcome

You will understand how to write robust, TAP-compatible tests that support unlimited parallelism, and you will be able to execute both individual and suite-wide test runs using the correct CLI commands.

## Related

- [Contributing Guidelines][contributing]
- [Build Instructions][build]
- [Test a Ledger Connector Plugin](./ledger-plugin-testing.md)
- [VS Code Setup](./vscode-setup.md)
<!-- --8<-- [end:content] -->

[contributing]: ../../CONTRIBUTING.md
[build]: ../../BUILD.md
