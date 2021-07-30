# Crypto Materials and Artifacts for Fabric Test Network (testnet)

The `network1` and `network2` stores pre-generated crypto materials and artifacts
so as to provide consistent behaviour in testnet.

If these get expired they can be generated again. First stop all testnet deployed components, and clean everything. Then follow the steps in following sections.

## Steps to generate

All paths in following steps are relative to this folder (`tests/network-setups/fabric/shared`).

1. Run following to delete existing crypto materials and artifacts:
    ```
    cd network1
    rm -rf ordererOrganizations/ peerOrganizations/ system-genesis-block/ channel-artifacts/ fabric-ca/ordererOrg/ fabric-ca/org1/
    cd ../network2
    rm -rf ordererOrganizations/ peerOrganizations/ system-genesis-block/ channel-artifacts/ fabric-ca/ordererOrg/ fabric-ca/org1/
    ```
2. Go to `../dev`, and run `make start-interop`. This will re-generate all crypto materials and artifacts.
3. Go to `network1/peerOrganizations/org1.network1.com`, create a copy of `connection-org1.json`, named `connection-org1.docker.json`. Edit the `connection-org1.docker.json`:
    - Line 27 change url, replace `localhost` to `peer0.org1.network1.com`.
    - Line 39 change url, replace `localhost` to `ca.org1.network1.com`.
4. Repeat above step 3, for `network2` as well, by replacing `network1` with `network2` in step 3.
5. Run following to allow these crypto materials to be checked in github:
    ```
    sudo chmod 644 network1/fabric-ca/ordererOrg/msp/keystore/*
    sudo chmod 644 network1/fabric-ca/org1/msp/keystore/*
    sudo chmod 644 network2/fabric-ca/ordererOrg/msp/keystore/*
    sudo chmod 644 network2/fabric-ca/org1/msp/keystore/*
    ```

## Steps to update wallets and credentials in other components:

1. Go to `core/drivers/fabric-driver`, and delete the contents of `wallet-network1` and `wallet-network2` folders.
2. Go to `samples/fabric/fabric-cli`, and follow these steps:
    - Delete contents of `src/wallet-network1` and `src/wallet-network2`.
    - Delete contents of `src/data/credentials/network1` and `src/data/credentials/network2`.
    - Delete contents of `src/data/credentials_docker/network1` and `src/data/credentials_docker/network2`.
3. Now follow the steps to run testnet demo provided [here](https://labs.hyperledger.org/weaver-dlt-interoperability/docs/external/getting-started), to:
    - Build and run `fabric-driver` for both networks. This will re-generate wallets for fabric-driver.
    - Build `fabric-cli`. Set up `.env` and `config.json` as per the steps there. (Don't run anything else in fabric-cli from the steps there).
4. Go to `samples/fabric/fabric-cli`, and run following commands to create credentials for fabric networks:
    ```
    ./bin/fabric-cli configure create all --local-network=network1
    ./bin/fabric-cli configure create all --local-network=network2
    ```
    This will re-generate all credentials and wallets for fabric-cli.
5. Now update credentials in other directories:
    - Go to `samples/fabric/fabric-cli` and copy `src/data/credentials/network1` and `src/data/credentials/network2` to `src/data/credentials_docker` directory.
    - Go to `samples/corda/corda-simple-application/clients/src/main/resources/config` and then follow these steps:
        1. With reference from `samples/fabric/fabric-cli/src/data/credentials/network1/access-control.json`, update the `rules.principal` key in `network1/access-control.json`.
        2. With reference from `samples/fabric/fabric-cli/src/data/credentials/network1/membership.json`, update the `members.Org1MSP.value` key in `network1/membership.json`.
        3. Repeat steps `a` and `b` for `network1-docker` as well with same reference.
        4. Repeat steps `a` and `b` for `network2` by replacing `network1` with `network2`.
        
---
