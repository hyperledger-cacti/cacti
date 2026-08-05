<!-- --8<-- [start:content] -->
# Create a New Package

This guide details the steps to create and configure a new package within the Hyperledger Cacti monorepo.

## Prerequisites
- A working Cacti development environment (see the Build Instructions).
- Familiarity with TypeScript and the project's monorepo structure.

## Steps

1. **Create the package directory**
   Create a new subfolder under the `/packages` folder.
2. **Name the package**
   Name the folder according to the convention: `cacti-$PLUGIN_TYPE-$PLUGIN_FLAVOR`. 
   For example: `cacti-plugin-satp-hermes`.
   > **Note**: Legacy packages may use the `cactus-` prefix, but all new packages should use `cacti-`.
3. **Set up the directory structure**
   Inside the new package folder, follow the base directory structure of current packages. The `dist` and `node_modules` folders are generated automatically, so you do not need to create them.
   
   Base structure:
   - `CHANGELOG.md`
   - `CONTRIBUTING.md` (optional, for package-specific guidelines)
   - `README.md`
   - `package.json`
   - `src/`
     - `main/`
       - `typescript/`
     - `test/`
       - `typescript/`
         - `unit/`
         - `integration/`
   - `tsconfig.json`

   Example for `cacti-plugin-satp-hermes`:
   - `CHANGELOG.md`
   - `README.md`
   - `package.json`
   - `src/`
     - `main/`
       - `typescript/`
       - `solidity/` (for smart contracts)
       - `yml/` (for OpenAPI specs)
     - `test/`
       - `typescript/`
         - `unit/`
         - `integration/`
       - `solidity/` (for contract tests)
       - `cucumber/` (for BDD tests)
   - `tsconfig.json`
   - `jest.config-unit.ts`
   - `jest.config-integration.ts`

4. **Configure `package.json`**
   In the `package.json` file, change the name to `@hyperledger-cacti/<your-package-name>`. 
   Example: `@hyperledger-cacti/cacti-plugin-satp-hermes`.
5. **Configure `tsconfig.json`**
   Ensure it extends the Hyperledger Cacti base `tsconfig.json` file. Follow this example:
   ```json
   {
      "extends": "../../tsconfig.base.json",
      "compilerOptions":
      {
         "composite": true,
         "outDir": "./dist/lib/",
         "declarationDir": "dist/lib",
         "rootDir": "./src",
         "tsBuildInfoFile": "../../.build-cache/cacti-plugin-satp-hermes.tsbuildinfo"
      },
      "include": [ "./src" ],
      "references": []
   }
   ```
6. **Add to the root `tsconfig.json`**
   Add your new package to the references array in Hyperledger Cacti's base `tsconfig.json` file located at the root.
   ```json
   {
      "references": [
         {
            "path": "./packages/cacti-api-client/tsconfig.json"
         },
         {
            "path": "./packages/cacti-plugin-my-new-package/tsconfig.json"
         },
         {
            "path": "./packages/cacti-plugin-satp-hermes/tsconfig.json"
         }
      ]
   }
   ```
   *Note: Sequence order matters. The packages are built sequentially, which can raise issues if there are dependencies between packages. More specialized packages (i.e. those with more dependencies) should be inserted lower in the list.*

7. **Configure the monorepo**
   At the root of the Hyperledger Cacti project, run:
   ```bash
   yarn configure
   ```
   If it runs successfully, your new package has been properly added to the workspace.

8. **Create a separate test package (Optional but recommended)**
   When testing, ensure you have a separate test package that can depend on the `api-server` package without causing circular dependencies. The recommended naming convention is `cacti-test-$PLUGIN_TYPE-$PLUGIN_FLAVOR`. 
   Example: `cacti-test-plugin-satp-hermes`.

## Expected Outcome
A correctly structured new package is created, integrated into the monorepo's build configuration, and ready for development.

## Related
- [Contributing Guidelines][contributing]
- [Conventions][conventions]
- [Build Instructions][build]

<!-- --8<-- [end:content] -->

[contributing]: ../../CONTRIBUTING.md
[conventions]: ../../CONVENTIONS.md
[build]: ../../BUILD.md
