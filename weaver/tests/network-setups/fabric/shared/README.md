# Crypto Materials and Artifacts for Fabric Test Network (testnet)

The `network1` and `network2` stores pre-generated crypto materials and artifacts
so as to provide consistent behaviour in testnet.

If these get expired they can be generated again. First stop all testnet deployed components, and clean everything. Then follow the steps in following sections.

## Steps to generate

All paths in following steps are relative to this folder (`tests/network-setups/fabric/dev`).

1. Run following to delete existing crypto materials and artifacts:
    ```
    make delete-artifacts
    ```
2. Run:
    ```
    make start-interop PROFILE="2-nodes"
    ```
   This will re-generate all crypto materials and artifacts.
3. To generate ccp file for docker, run:
    ```
    make docker-ccp
    ```
5. Run following to allow these crypto materials to be checked in github:
    ```
    make chmod-artifacts 
    ```

## Steps to update wallets and credentials in other components:

1. Go to `core/drivers/fabric-driver`, and delete the contents of `wallet-network1` and `wallet-network2` folders.
2. Go to `samples/fabric/fabric-cli`, and follow these steps:
    - Delete contents of `src/wallet-network1` and `src/wallet-network2`.
    - Delete contents of `src/data/credentials/network1` and `src/data/credentials/network2`.
    - Delete contents of `src/data/credentials_docker/network1` and `src/data/credentials_docker/network2`.
3. Now follow the steps to run testnet demo provided [here](https://labs.hyperledger.org/weaver-dlt-interoperability/docs/external/getting-started/test-network/setup-local#fabric-driver), to build and run `fabric-driver` for both networks. This will re-generate wallets for fabric-driver.
4. Build `fabric-cli`. Set up `.env` and `config.json` as per the steps in docs. (Don't run anything else in fabric-cli from the steps there).
4. Go to `samples/fabric/fabric-cli`, and run following commands to create credentials for fabric networks:
    ```
    ./scripts/createUsers.sh
    ./bin/fabric-cli configure create all --local-network=network1
    ./bin/fabric-cli configure create all --local-network=network2
    ```
    This will re-generate all credentials and wallets for fabric-cli.
5. Now update credentials in other directories:
    - Go to `samples/fabric/fabric-cli` and copy `src/data/credentials/network1` and `src/data/credentials/network2` to `src/data/credentials_docker` directory.
    - Go to `samples/corda/corda-simple-application/clients/src/main/resources/config` and then follow these steps:
        1. Copy `samples/fabric/fabric-cli/src/data/remoteNetworkUsers/network1_UsersAndCerts.json` to `remoteNetworkUsers/network1_UsersAndCerts.json`.
        2. Copy `samples/fabric/fabric-cli/src/data/credentials/network1/membership.json` to `credentials/network1/membership.json`.
        3. Update `credentials/network1/access-control.json` as follows:
            - For policies with flow `GetStateByKey`, copy certificate from `samples/fabric/fabric-cli/src/src/wallet-network1/user1.id`, and paste in the `rules.principal` key.
            - For all other policies (with flows related to asset transfer), copy certificate from `samples/fabric/fabric-cli/src/src/wallet-network1/alice.id`, and paste in the `rules.principal` key.
        4. Repeat steps `b` and `c` for `network1-docker`.
        5. Repeat steps `b` and `c` for `network2` by replacing `network1` with `network2`.
6. Go to `tests/network-setups/fabric/dev` folder, and finally run, to create backup of artifacts:
    ```
    make backup
    ```
Note: Do Update the certs in `fabric-interop-cc/contracts/interop/test_data` and `corda-interop-app/interop-workflows/src/test/resources/test_data` folders for unit tests of `WriteExternalState`.
---
