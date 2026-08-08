<!-- --8<-- [start:content] -->
# Set Up VS Code

This guide provides configuration steps and tips for optimizing Visual Studio Code when developing in the Hyperledger Cacti repository.

## Prerequisites
- Visual Studio Code installed.
- A cloned Hyperledger Cacti repository.

## Steps

1. **Refresh TypeScript definitions**
   If you add a new dependency and VS Code shows an error when trying to import it, you may need to reload the TypeScript definitions so it recognizes the new package.
   - Hit the `F1` key (or your bound command menu shortcut).
   - Search for and select `Developer: Reload Window`.
   - Alternatively, quit and relaunch the VS Code application.

2. **Configure debugging tasks**
   Set up your launch configuration to easily run and debug tests:
   - Open the `.vscode/template.launch.json` file.
   - Copy or rename it to `launch.json` (if you don't already have one).
   - Alternatively, you can cherry-pick the specific VS Code debug tasks you'd like to use.

3. **Debug a single test case**
   To debug a specific test case, ensure your VS Code editor is focused on the test file you wish to run.
   - Select the debug task named `TAP: Current TS Test File` from your `launch.json`.
   - Set breakpoints in the code as needed. Breakpoints will work successfully as long as you are debugging code within the same package.
   > **Note**: Source map support is currently partial but is actively being improved.

4. **Run tests via the UI**
   You can also execute tests directly from the VS Code user interface:
   - Make sure you have renamed `template.launch.json` to `launch.json`.
   - Navigate to the "Run and Debug" panel in VS Code.
   - Select `JEST: Current TS file` to test the currently opened file.

## Expected Outcome
Your VS Code environment is properly configured to recognize new dependencies, debug test cases easily, and execute tests directly from the editor.

## Related
- [Build Instructions][build]
- [Testing Guide][testing-guide]
- [Managing Dependencies][managing-dependencies]

<!-- --8<-- [end:content] -->

[build]: ../../BUILD.md
[testing-guide]: ./testing-guide.md
[managing-dependencies]: ./managing-dependencies.md
