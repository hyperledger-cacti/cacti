# `@hyperledger/cactus-test-verifier-client`

## Usage

### Stress test
- Used for manual leak analysis.
- The test will execute with exposed GC and disabled optimizations.
- Results will be written to `./integration-with-verifier-client-stress.log` for further analysis (in the `cwd` where you execute the command). Columns (in order):
  - `rss`
  - `heapTotal`
  - `heapUsed`
  - `external`
  - `arrayBuffers`
- Report lines:
  - Initial memory usage (before running the tests).
  - Usage after running the stress test.
  - Usage after freeing the verifier client.
- You can uncomment the `checkMemory` call in test file for more step-by-step report, but it will make the test run longer.
- To investigate with the node debugger use `stress-test-inspect` script.

``` bash
# Make sure the build was successful before executing these commands.

# Execute stress test
yarn run stress-test

# Execute stress test with debugger inspect break
yarn run stress-test-inspect
```

## FAQ

### **What is a dedicated test package for?**

This is a dedicated test package meaning that it verifies the integration between two packages that are somehow dependent on each other and therefore these tests cannot be added properly in the child package due to circular dependency issues and it would not be fitting to add it in the parent because the child package's tests should not be held by the parent as a matter of principle.
