---
id: data-sharing
title: Data Sharing
pagination_prev: external/getting-started/interop/overview
pagination_next: external/getting-started/enabling-weaver-network/overview
---

<!--
 Copyright IBM Corp. All Rights Reserved.

 SPDX-License-Identifier: CC-BY-4.0
 -->

This document lists sample ways in which you can exercise the data-sharing interoperation protocol on the test network [launched earlier](external/getting-started/test-network/overview.md).

Once the networks, relays, and drivers have been launched, and the ledgers bootstrapped, you can trigger four different interoperation flows corresponding to distinct data-sharing combinations as follows:
1. **Corda to Corda**: Either Corda network requests state and proof from another Corda network
2. **Corda to Fabric**: The Corda network requests state and proof from either Fabric network
3. **Fabric to Corda**: Either Fabric network requests state and proof from the Corda network
4. **Fabric to Fabric**: One Fabric network requests state and proof from another Fabric network

We assume that one of the following chaincodes have been deployed in either Fabric network you are testing with:
* `simplestate`
* `simplestatewithacl`

## Corda to Corda

To test the scenario where `Corda_Network` requests the value of the state (key) `H` from `Corda_Network2`, do the following:
- (_Make sure the following are running_: `Corda_Network`, relay, and driver; `Corda_Network2`, relay, and driver)
- Navigate to the `samples/corda/corda-simple-application` folder.
- Run the following:
  * If Relays and Drivers are deployed in the host machine:
    - Without TLS:
      ```bash
      NETWORK_NAME=Corda_Network CORDA_PORT=10006 ./clients/build/install/clients/bin/clients request-state localhost:9081 localhost:9082/Corda_Network2/localhost:30006#com.cordaSimpleApplication.flow.GetStateByKey:H
      ```
    - With TLS:
      ```bash
      RELAY_TLS=true RELAY_TLSCA_CERT_PATHS=../../../core/relay/credentials/fabric_ca_cert.pem NETWORK_NAME=Corda_Network CORDA_PORT=10006 ./clients/build/install/clients/bin/clients request-state localhost:9081 localhost:9082/Corda_Network2/localhost:30006#com.cordaSimpleApplication.flow.GetStateByKey:H
      ```
  * If Relays and Drivers are deployed in Docker containers:
    - Without TLS:
      ```bash
      NETWORK_NAME=Corda_Network CORDA_PORT=10006 ./clients/build/install/clients/bin/clients request-state localhost:9081 relay-corda2:9082/Corda_Network2/corda_network2_partya_1:10003#com.cordaSimpleApplication.flow.GetStateByKey:H
      ```
    - With TLS:
      ```bash
      RELAY_TLS=true RELAY_TLSCA_CERT_PATHS=../../../core/relay/credentials/docker/ca-cert.pem NETWORK_NAME=Corda_Network CORDA_PORT=10006 ./clients/build/install/clients/bin/clients request-state localhost:9081 relay-corda2:9082/Corda_Network2/corda_network2_partya_1:10003#com.cordaSimpleApplication.flow.GetStateByKey:H
      ```
- Query the value of the requested state using key `H` in `Corda_Network` by running the following command:
  ```bash
  NETWORK_NAME=Corda_Network CORDA_PORT=10006 ./clients/build/install/clients/bin/clients get-state H
  ```

To test the scenario where `Corda_Network2` requests the value of the state (key) `C` from `Corda_Network`, do the following:
- (_Make sure the following are running_: `Corda_Network`, relay, and driver; `Corda_Network2`, relay, and driver)
- Navigate to the `samples/corda/corda-simple-application` folder.
- Run the following:
  * If Relays and Drivers are deployed in the host machine:
    - Without TLS:
      ```bash
      NETWORK_NAME=Corda_Network2 CORDA_PORT=30006 ./clients/build/install/clients/bin/clients request-state localhost:9082 localhost:9081/Corda_Network/localhost:10006#com.cordaSimpleApplication.flow.GetStateByKey:C
      ```
    - With TLS:
      ```bash
      RELAY_TLS=true RELAY_TLSCA_CERT_PATHS=../../../core/relay/credentials/fabric_ca_cert.pem NETWORK_NAME=Corda_Network2 CORDA_PORT=30006 ./clients/build/install/clients/bin/clients request-state localhost:9082 localhost:9081/Corda_Network/localhost:10006#com.cordaSimpleApplication.flow.GetStateByKey:C
      ```
  * If Relays and Drivers are deployed in Docker containers:
    - Without TLS:
      ```bash
      NETWORK_NAME=Corda_Network2 CORDA_PORT=30006 ./clients/build/install/clients/bin/clients request-state localhost:9082 relay-corda:9081/Corda_Network/corda_partya_1:10003#com.cordaSimpleApplication.flow.GetStateByKey:C
      ```
    - With TLS:
      ```bash
      RELAY_TLS=true RELAY_TLSCA_CERT_PATHS=../../../core/relay/credentials/docker/ca-cert.pem NETWORK_NAME=Corda_Network2 CORDA_PORT=30006 ./clients/build/install/clients/bin/clients request-state localhost:9082 relay-corda:9081/Corda_Network/corda_partya_1:10003#com.cordaSimpleApplication.flow.GetStateByKey:C
      ```
- Query the value of the requested state, using the key `C` in `Corda_Network` by running the following command:
  ```bash
  NETWORK_NAME=Corda_Network2 CORDA_PORT=30006 ./clients/build/install/clients/bin/clients get-state C
  ```

## Corda to Fabric

To test the scenario where `Corda_Network` requests the value of the state (key) `a` from `network1`, do the following:
- (_Make sure the following are running_: Corda network, relay, and driver; Fabric `network1`, relay, and driver)
- Navigate to the `samples/corda/corda-simple-application` folder.
- Run the following:
  * If Relays and Drivers are deployed in the host machine:
    - Without TLS:
      ```bash
      NETWORK_NAME=Corda_Network CORDA_PORT=10006 ./clients/build/install/clients/bin/clients request-state localhost:9081 localhost:9080/network1/mychannel:simplestate:Read:a
      ```
    - With TLS:
      ```bash
      RELAY_TLS=true RELAY_TLSCA_CERT_PATHS=../../../core/relay/credentials/fabric_ca_cert.pem NETWORK_NAME=Corda_Network CORDA_PORT=10006 ./clients/build/install/clients/bin/clients request-state localhost:9081 localhost:9080/network1/mychannel:simplestate:Read:a
      ```
  * If Relays and Drivers are deployed in Docker containers:
    - Without TLS:
      ```bash
      NETWORK_NAME=Corda_Network CORDA_PORT=10006 ./clients/build/install/clients/bin/clients request-state localhost:9081 relay-network1:9080/network1/mychannel:simplestate:Read:a
      ```
    - With TLS:
      ```bash
      RELAY_TLS=true RELAY_TLSCA_CERT_PATHS=../../../core/relay/credentials/docker/ca-cert.pem NETWORK_NAME=Corda_Network CORDA_PORT=10006 ./clients/build/install/clients/bin/clients request-state localhost:9081 relay-network1:9080/network1/mychannel:simplestate:Read:a
      ```
- Query the value of the requested state (key) `a` in `Corda_Network` using the following:
  ```bash
  NETWORK_NAME=Corda_Network CORDA_PORT=10006 ./clients/build/install/clients/bin/clients get-state a
  ```

To test the scenario where `Corda_Network` requests the value of the state (key) `Arcturus` from `network2`, do the following:
- (_Make sure the following are running_: Corda network, relay, and driver; Fabric `network2`, relay, and driver)
- Navigate to the `samples/corda/corda-simple-application` folder.
- Run the following:
  * If Relays and Drivers are deployed in the host machine:
    - Without TLS:
      ```bash
      NETWORK_NAME=Corda_Network CORDA_PORT=10006 ./clients/build/install/clients/bin/clients request-state localhost:9081 localhost:9083/network2/mychannel:simplestate:Read:Arcturus
      ```
    - With TLS:
      ```bash
      RELAY_TLS=true RELAY_TLSCA_CERT_PATHS=../../../core/relay/credentials/fabric_ca_cert.pem NETWORK_NAME=Corda_Network CORDA_PORT=10006 ./clients/build/install/clients/bin/clients request-state localhost:9081 localhost:9083/network2/mychannel:simplestate:Read:Arcturus
      ```
  * If Relays and Drivers are deployed in Docker containers:
    - Without TLS:
      ```bash
      NETWORK_NAME=Corda_Network CORDA_PORT=10006 ./clients/build/install/clients/bin/clients request-state localhost:9081 relay-network2:9083/network2/mychannel:simplestate:Read:Arcturus
      ```
    - With TLS:
      ```bash
      RELAY_TLS=true RELAY_TLSCA_CERT_PATHS=../../../core/relay/credentials/docker/ca-cert.pem NETWORK_NAME=Corda_Network CORDA_PORT=10006 ./clients/build/install/clients/bin/clients request-state localhost:9081 relay-network2:9083/network2/mychannel:simplestate:Read:Arcturus
      ```
- Query the value of the requested state (key) `Arcturus` in `Corda_Network` using the following:
  ```bash
  NETWORK_NAME=Corda_Network CORDA_PORT=10006 ./clients/build/install/clients/bin/clients get-state Arcturus
  ```
  
| Notes |
|:------|
| You can test the above data transfer scenario with `Corda_Network2` instead of `Corda_Network` by changing the following in the `request-state` or `get-state` command:<ul><li>Network name environment variable:<ul><li>`NETWORK_NAME=Corda_Network` to `NETWORK_NAME=Corda_Network2`</li></ul></li><li>Corda node's RPC endpoint port environment variable:<ul><li>`CORDA_PORT=10006` to `CORDA_PORT=30006`</li></ul></li><li>Local relay address<ul><li>`localhost:9081` to `localhost:9082` (host deployment of relays and drivers)</li><li>`relay-corda2:9081` to `relay-corda2:9082` (Docker container deployment of relays and drivers)</li></ul></li></ul> |

## Fabric to Corda

To test the scenario where `network1` requests the value of the state (key) `H` from `Corda_Network`, do the following:
- (_Make sure the following are running_: Corda network, relay, and driver; Fabric `network1`, relay, and driver)
- Navigate to the `samples/fabric/fabric-cli` (for the Node.js version) or the `samples/fabric/go-cli` (for the Golang version) folder.
- (Make sure you have configured `fabric-cli` as per earlier instructions)
- Edit `chaincode.json`: in the `simplestate:Create:args` attribute, replace the argument `"a"` with `"H"` (this specifies the key to which the data from the remote view is to be written into); i.e.,:
  ```json
  "args": ["a", ""]
  ```
  with
  ```json
  "args": ["H", ""]
  ```
- Run the following:
  * If Relays and Drivers are deployed in the host machine:
    - Without TLS:
      ```bash
      ./bin/fabric-cli interop --local-network=network1 --sign=true --requesting-org=Org1MSP localhost:9081/Corda_Network/localhost:10006#com.cordaSimpleApplication.flow.GetStateByKey:H --debug=true
      ```
    - With TLS:
      ```bash
      ./bin/fabric-cli interop --local-network=network1 --sign=true --requesting-org=Org1MSP --relay-tls=true --relay-tls-ca-files=../../../core/relay/credentials/fabric_ca_cert.pem localhost:9081/Corda_Network/localhost:10006#com.cordaSimpleApplication.flow.GetStateByKey:H --debug=true
      ```
  * If Relays and Drivers are deployed in Docker containers:
    - Without TLS:
      ```bash
      ./bin/fabric-cli interop --local-network=network1 --sign=true --requesting-org=Org1MSP relay-corda:9081/Corda_Network/corda_partya_1:10003#com.cordaSimpleApplication.flow.GetStateByKey:H --debug=true
      ```
    - With TLS:
      ```bash
      ./bin/fabric-cli interop --local-network=network1 --sign=true --requesting-org=Org1MSP --relay-tls=true --relay-tls-ca-files=../../../core/relay/credentials/docker/ca-cert.pem relay-corda:9081/Corda_Network/corda_partya_1:10003#com.cordaSimpleApplication.flow.GetStateByKey:H --debug=true
      ```
- Query the value of the requested state (key) `H` in `network1` using the following:
  ```bash
  ./bin/fabric-cli chaincode query mychannel simplestate read '["H"]' --local-network=network1
  ```

To test the scenario where `network2` requests the value of the state (key) `H` from `Corda_Network`, do the following:
- (_Make sure the following are running_: Corda network, relay, and driver; Fabric `network2`, relay, and driver)
- Navigate to the `samples/fabric/fabric-cli` (for the Node.js version) or the `samples/fabric/go-cli` (for the Golang version) folder.
- (Make sure you have configured `fabric-cli` as per earlier instructions)
- Edit `chaincode.json`: in the `simplestate:Create:args` attribute, replace the argument `"a"` with `"H"` (this specifies the key to which the data from the remote view is to be written into); i.e.,:
  ```json
  "args": ["a", ""]
  ```
  with
  ```json
  "args": ["H", ""]
  ```
- Run the following:
  * If Relays and Drivers are deployed in the host machine:
    - Without TLS:
      ```bash
      ./bin/fabric-cli interop --local-network=network2 --sign=true --requesting-org=Org1MSP localhost:9081/Corda_Network/localhost:10006#com.cordaSimpleApplication.flow.GetStateByKey:H --debug=true
      ```
    - With TLS:
      ```bash
      ./bin/fabric-cli interop --local-network=network2 --sign=true --requesting-org=Org1MSP --relay-tls=true --relay-tls-ca-files=../../../core/relay/credentials/fabric_ca_cert.pem localhost:9081/Corda_Network/localhost:10006#com.cordaSimpleApplication.flow.GetStateByKey:H --debug=true
      ```
  * If Relays and Drivers are deployed in Docker containers:
    - Without TLS:
      ```bash
      ./bin/fabric-cli interop --local-network=network2 --sign=true --requesting-org=Org1MSP relay-corda:9081/Corda_Network/corda_partya_1:10003#com.cordaSimpleApplication.flow.GetStateByKey:H --debug=true
      ```
    - With TLS:
      ```bash
      ./bin/fabric-cli interop --local-network=network2 --sign=true --requesting-org=Org1MSP --relay-tls=true --relay-tls-ca-files=../../../core/relay/credentials/docker/ca-cert.pem relay-corda:9081/Corda_Network/corda_partya_1:10003#com.cordaSimpleApplication.flow.GetStateByKey:H --debug=true
      ```
- Query the value of the requested state (key) `H` in `network2` using the following:
  ```bash
  ./bin/fabric-cli chaincode query mychannel simplestate read '["H"]' --local-network=network2
  ```

| Notes |
|:------|
| You can test the above data transfer scenario with `Corda_Network2` instead of `Corda_Network` by changing the following in the view address (last parameter in the `interop` command):<ul><li>Local relay address (prefix):<ul><li>`localhost:9081` to `localhost:9082` (host deployment of relays and drivers)</li><li>`relay-corda2:9081` to `relay-corda2:9082` (Docker container deployment of relays and drivers)</li></ul></li><li>Network name:<ul><li>`Corda_Network` to `Corda_Network2`</li></ul></li><li>Corda node's RPC endpoint:<ul><li>`localhost:10006` to `localhost:30006` (host deployment of relays and drivers)</li><li>`corda_partya_1:10003` to `corda_network2_partya_1:10003` (Docker container deployment of relays and drivers)</li></ul></li></ul> |

## Fabric to Fabric

To test the scenario where `network1` requests the value of the state (key) `Arcturus` from `network2`, do the following:
- (_Make sure the following are running_: Fabric `network1`, relay, and driver; Fabric `network2`, relay, and driver)
- Navigate to the `samples/fabric/fabric-cli` (for the Node.js version) or the `samples/fabric/go-cli` (for the Golang version) folder.
- (Make sure you have configured `fabric-cli` as per earlier instructions)
- Edit `chaincode.json`: in the `simplestate:Create:args` attribute, replace the argument `"a"` with `"Arcturus"` (this specifies the key to which the data from the remote view is to be written into); i.e.,:
  ```json
  "args": ["a", ""]
  ```
  with
  ```json
  "args": ["Arcturus", ""]
  ```
- Run the following:
  * If Relays and Drivers are deployed in the host machine:
    - Without TLS:
      ```bash
      ./bin/fabric-cli interop --local-network=network1 --requesting-org=Org1MSP localhost:9083/network2/mychannel:simplestate:Read:Arcturus
      ```
    - With TLS:
      ```bash
      ./bin/fabric-cli interop --local-network=network1 --requesting-org=Org1MSP --relay-tls=true --relay-tls-ca-files=../../../core/relay/credentials/fabric_ca_cert.pem localhost:9083/network2/mychannel:simplestate:Read:Arcturus
      ```
  * If Relays and Drivers are deployed in Docker containers:
    - Without TLS:
      ```bash
      ./bin/fabric-cli interop --local-network=network1 --requesting-org=Org1MSP relay-network2:9083/network2/mychannel:simplestate:Read:Arcturus
      ```
    - With TLS:
      ```bash
      ./bin/fabric-cli interop --local-network=network1 --requesting-org=Org1MSP --relay-tls=true --relay-tls-ca-files=../../../core/relay/credentials/docker/ca-cert.pem relay-network2:9083/network2/mychannel:simplestate:Read:Arcturus
      ```

| Notes |
|:------|
| If you wish to enable end-to-end confidentiality for this data sharing session, add the `--e2e-confidentiality=true` switch to any of the above commands. For example: `./bin/fabric-cli interop --local-network=network1 --requesting-org=Org1MSP --e2e-confidentiality=true localhost:9083/network2/mychannel:simplestate:Read:Arcturus` |
- Query the value of the requested state (key) `Arcturus` in `network1` using the following:
  ```bash
  ./bin/fabric-cli chaincode query mychannel simplestate read '["Arcturus"]' --local-network=network1
  ```

To test the scenario where `network2` requests the value of the state (key) `a` from `network1`, do the following:
- (_Make sure the following are running_: Fabric `network1`, relay, and driver; Fabric `network2`, relay, and driver)
- Navigate to the `samples/fabric/fabric-cli` (for the Node.js version) or the `samples/fabric/go-cli` (for the Golang version) folder.
- (Make sure you have configured `fabric-cli` as per earlier instructions)
- (There is no need to edit `chaincode.json` to change the key as the default argument `"a"` is what we intend to use in this data sharing use scenario.)
- Run the following:
  * If Relays and Drivers are deployed in the host machine:
    - Without TLS:
      ```bash
      ./bin/fabric-cli interop --local-network=network2 --requesting-org=Org1MSP localhost:9080/network1/mychannel:simplestate:Read:a
      ```
    - With TLS:
      ```bash
      ./bin/fabric-cli interop --local-network=network2 --requesting-org=Org1MSP --relay-tls=true --relay-tls-ca-files=../../../core/relay/credentials/fabric_ca_cert.pem localhost:9080/network1/mychannel:simplestate:Read:a
      ```
  * If Relays and Drivers are deployed in Docker containers:
    - Without TLS:
      ```bash
      ./bin/fabric-cli interop --local-network=network2 --requesting-org=Org1MSP relay-network1:9080/network1/mychannel:simplestate:Read:a
      ```
    - With TLS:
      ```bash
      ./bin/fabric-cli interop --local-network=network2 --requesting-org=Org1MSP --relay-tls=true --relay-tls-ca-files=../../../core/relay/credentials/docker/ca-cert.pem relay-network1:9080/network1/mychannel:simplestate:Read:a:173
      ```

| Notes |
|:------|
| If you wish to enable end-to-end confidentiality for this data sharing session, add the `--e2e-confidentiality=true` switch to any of the above commands. For example: `./bin/fabric-cli interop --local-network=network2 --requesting-org=Org1MSP --e2e-confidentiality=true localhost:9080/network1/mychannel:simplestate:Read:a` |
- Query the value of the requested state (key) `a` in `network2` using the following:
  ```bash
  ./bin/fabric-cli chaincode query mychannel simplestate read '["a"]' --local-network=network2
  ```

