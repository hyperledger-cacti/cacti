import subprocess
import time
import sys
import os

# input1: name of a python file with the same name that calculates the a cross-chain model
# Input2: name of test CSV file that generates the model in the file above
# Input2: number of test runs
# input 4: name of output file
# Output: output files corresponding to number of runs on packages/cactus-plugin-cc-tx-visualization/src/main/test-results  
# Example:python3 run-generate-cross-chain-model-dummy.py generate-ccmodel-dummy example-dummy-use-case.csv 30 generate-cross-chain-model-dummy
 
#
# Example e2e generate ccmodel for different CSVs (different #events)
#python3 run-generate-cross-chain-model-dummy.py generate-ccmodel-dummy example-dummy-use-case.csv 100 generate-cross-chain-model-baseline &&
#python3 run-generate-cross-chain-model-dummy.py generate-ccmodel-dummy dummy-use-case-60-events.csv 100 generate-cross-chain-model-60-events &&
#python3 run-generate-cross-chain-model-dummy.py generate-ccmodel-dummy dummy-use-case-600-events.csv 100 generate-cross-chain-model-600-events&&
#python3 run-generate-cross-chain-model-dummy.py generate-ccmodel-dummy dummy-use-case-6000-events.csv 100 generate-cross-chain-model-6000-events

#output name = dummy-use-case-6-ccmodel

### TODO transform cctxviz model generation book into a py file or learn how to call it
### parameters name of csv to generate model; perhaps algoritm name; 
### prints execution time to file, similar to other script

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
    modelPlaybook = args[0]
    targetCsvFile = args[1]
    outputName = args[2]
    numberTests = args[3]
    cumulativeTimeStart = time.time()
    OUTPUT_DIR = "packages/cactus-plugin-cc-tx-visualization/src/main/test-results/"
    TEST_DIR = "packages/cactus-plugin-cc-tx-visualization/src/main/python/"
    # directory is given as input to subprocess
    TARGET =   "python3 "  + TEST_DIR + modelPlaybook + ".py "
    FULL_COMMAND = TARGET + targetCsvFile;
    print("Running: ", FULL_COMMAND)

    runs = int(numberTests)
    while runs > 0:
        SAVE_STRING =  os.path.join("../", "test-results/") +outputName + "-" + str(runs) + ".out"
        print("Saving out in:", SAVE_STRING)
        print("Iteration %\n ", runs)
        main()
        runs -= 1
    cumulativeTimeEnd = time.time()
    print("\n==========")
    print("\nTotal number of tests done:",numberTests )
    print("\n==========")
    print("\nType of tests done:",modelPlaybook )
    print("\n==========")
    print("\nTotal Running time: {:01f}\n".format(cumulativeTimeEnd-cumulativeTimeStart))
