#!/bin/bash

ROOT_DIR=`realpath ../../..`

# --------------------------- SWITCHES ---------------------------

function main_switch(){
    case $1 in
        -t)
        tests "$2"
        ;;
        help)
        echo "-----------------------------------------------------------------------------------"
        echo "Usage for test-runner: $0 {-t} {test_connection|test_configs|all}"
        echo "Parameters:
            - test_connection - executes set of tests to check connection between all components
            - test_configs - executes set of tests to validate config files in /etc/cactus
            - all - executes all available tests for current BLP"
        echo "-----------------------------------------------------------------------------------"
        ;;
        *)
        echo "Wrong parameter provided
        Use <$0 help> for more info"
        ;;
    esac
}

function tests(){
    case $1 in
        test_connection)
        test_connection
        ;;
        test_configs)
        test_configs
        ;;
        all)
        all
        ;;
        *)
        echo "Wrong test provided. Available: {test_connection|test_configs|all}"
        ;;
    esac
}

# --------------------------- TEST FUNCTIONS ---------------------------

function test_connection(){
    cd $ROOT_DIR
    npx jest examples/cactus-check-connection-ethereum-validator/src/test/typescript/integration/check-connection-to-ledger.test.ts
}

function test_configs(){
    cd $ROOT_DIR
    npx jest examples/cactus-check-connection-ethereum-validator/src/test/typescript/integration/check-config-files.test.ts
}

function all(){
    test_connection
    test_configs
}

# --------------------------- MAIN EXECUTION ---------------------------

main_switch "$1" "$2"