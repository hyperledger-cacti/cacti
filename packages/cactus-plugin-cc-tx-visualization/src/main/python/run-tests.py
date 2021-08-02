import subprocess
import time
import sys
import os

# Input1: name of test file inside packages/cactus-plugin-cc-tx-visualization/src/test/typescript/integration
# Input2: name of file to save
# Input3: number of test runs
# Input4: if tests use jest parameter is True, if TAP is false or nonexisting
# Output: test files corresponding to number of runs on packages/cactus-plugin-cc-tx-visualization/src/main/test-results  
# Example: python3 run-tests.py cctxviz-generate-use-case-dummy 30
# Example: python3 run-tests.py cctxviz-generate-use-case-dummy-60-events 100 && python3 run-tests.py cctxviz-generate-use-case-dummy-600-events 100 && python3 run-tests.py cctxviz-generate-use-case-dummy-6000-events 100 
# Example ython3 run-tests.py initialize-cctxviz-usecase-fabric-besu use-case-fabric-besu 50 JEST
def main():
    start = time.time()
    file = open(SAVE_STRING, "wb")

    process = subprocess.Popen(FULL_COMMAND.split(), cwd="/home/rbelchior/blockchain-integration-framework", stdout=subprocess.PIPE)
    output, error = process.communicate()
    print("error: \n {}", error)
    #outputText = sys.stdout.buffer.write(bytes(output,"utf-8"))
    file.write(output)
    file.close()

    end = time.time()

    print("\n==========")
    print("\nPartial Running time: {:01f}\n".format(end-start))


if __name__ == "__main__":
    args = sys.argv[1:]
    testName = args[0]
    saveFileName = args[1]
    numberTests = args[2]
    runner = args[3]

    cumulativeTimeStart = time.time()
    TEST_EXTENSION = ".test.ts"
    OUTPUT_DIR = "packages/cactus-plugin-cc-tx-visualization/src/main/test-results/"
    TEST_DIR = "packages/cactus-plugin-cc-tx-visualization/src/test/typescript/integration/"
    # directory is given as input to subprocess
    if runner == "TAP":
        VS_CODE_PARTIAL_SCRIPT = "npx tap --ts --no-timeout " 
    elif runner == "JEST":
        VS_CODE_PARTIAL_SCRIPT = "yarn jest -t "
                #VS_CODE_PARTIAL_SCRIPT = "sudo /usr/bin/env 'NODE_OPTIONS=--require /home/rafaelapb/.vscode-server-insiders/bin/6f7c824a826ff0ccaf4de05d6fe0aac3be7bc136/extensions/ms-vscode.js-debug/src/bootloader.bundle.js --inspect-publish-uid=http' 'VSCODE_INSPECTOR_OPTIONS={\"inspectorIpc\":\"/tmp/node-cdp.1581-35.sock\",\"deferredMode\":false,\"waitForDebugger\":\"\",\"execPath\":\"/home/rafaelapb/.nvm/versions/node/v16.14.0/bin/node\",\"onlyEntrypoint\":false,\"autoAttachMode\":\"always\",\"mandatePortTracking\":true,\"fileCallback\":\"/tmp/node-debug-callback-d54e139f04bc4e75\"}' /home/rafaelapb/.nvm/versions/node/v16.14.0/bin/node /home/rbelchior/blockchain-integration-framework/node_modules/.bin/jest " 
    #default    
    else: 
        VS_CODE_PARTIAL_SCRIPT = "npx tap --ts --no-timeout "
    TARGET =  VS_CODE_PARTIAL_SCRIPT + TEST_DIR + testName + TEST_EXTENSION
    FULL_COMMAND = TARGET
    print("Running: ", FULL_COMMAND)

    runs = int(numberTests)
    while runs > 0:
        SAVE_STRING =  os.path.join("../", "test-results/") + saveFileName + "-" + str(runs) + ".out"
        print("Saving out in:", SAVE_STRING)
        print("Iteration %\n ", runs)
        main()
        runs -= 1
    cumulativeTimeEnd = time.time()
    print("\n==========")
    print("\nTotal number of tests done:",numberTests )
    print("\n==========")
    print("\nType of tests done:",testName )
    print("\n==========")
    print("\nTotal Running time: {:01f}\n".format(cumulativeTimeEnd-cumulativeTimeStart))
