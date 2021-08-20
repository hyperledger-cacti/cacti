---
id: data-sharing
title: Data Sharing
---

<!--
 Copyright IBM Corp. All Rights Reserved.

 SPDX-License-Identifier: CC-BY-4.0
 -->

This document lists sample ways in which you can exercise the data-sharing interoperation protocol on the test network [launched earlier](../test-network/overview).

Once the networks, relays, and drivers have been launched, and the ledgers bootstrapped, you can trigger three different interoperation flows corresponding to distinct data-sharing combinations as follows:
1. **Corda to Fabric**: The Corda network requests state and proof from either Fabric network
2. **Fabric to Corda**: Either Fabric network requests state and proof from the Corda network
3. **Fabric to Fabric**: One Fabric network requests state and proof from another Fabric network

## Host Deployment

### Corda to Fabric

To test the scenario where `Corda_Network` requests the value of the state (key) `a` from `network1`, do the following:
- (_Make sure the following are running_: Corda network, relay, and driver; Fabric `network1`, relay, and driver)
- Navigate to the `samples/corda/corda-simple-application` folder.
- Run the following:
  ```bash
  ./clients/build/install/clients/bin/clients request-state localhost:9081 localhost:9080/network1/mychannel:simplestate:Read:a
  ```
- Query the value of the requested state (key) `a` in `Corda_Network` using the following:
  ```bash
  ./clients/build/install/clients/bin/clients get-state a
  ```

To test the scenario where `Corda_Network` requests the value of the state (key) `Arcturus` from `network2`, do the following:
- (_Make sure the following are running_: Corda network, relay, and driver; Fabric `network2`, relay, and driver)
- Navigate to the `samples/corda/corda-simple-application` folder.
- Run the following:
  ```bash
  ./clients/build/install/clients/bin/clients request-state localhost:9081 localhost:9083/network2/mychannel:simplestate:Read:Arcturus
  ```
- Query the value of the requested state (key) `Arcturus` in `Corda_Network` using the following:
  ```bash
  ./clients/build/install/clients/bin/clients get-state Arcturus
  ```

### Fabric to Corda

To test the scenario where `network1` requests the value of the state (key) `H` from `Corda_Network`, do the following:
- (_Make sure the following are running_: Corda network, relay, and driver; Fabric `network1`, relay, and driver)
- Navigate to the `samples/fabric/fabric-cli` folder.
- (Make sure you have configured `fabric-cli` as per earlier instructions)
- Run the following:
  ```bash
  ./bin/fabric-cli interop --key=H --local-network=network1 --sign=true --requesting-org=Org1MSP localhost:9081/Corda_Network/localhost:10006#com.cordaSimpleApplication.flow.GetStateByKey:H --debug=true
  ```
- Query the value of the requested state (key) `H` in `network1` using the following (replace the Args with the Args value obtained in the previous command):
  ```bash
  ./bin/fabric-cli chaincode query mychannel simplestate read '["H"]' --local-network=network1
  ```

To test the scenario where `network2` requests the value of the state (key) `H` from `Corda_Network`, do the following:
- (_Make sure the following are running_: Corda network, relay, and driver; Fabric `network2`, relay, and driver)
- Navigate to the `samples/fabric/fabric-cli` folder.
- (Make sure you have configured `fabric-cli` as per earlier instructions)
- Run the following:
  ```bash
  ./bin/fabric-cli interop --key=H --local-network=network2 --sign=true --requesting-org=Org1MSP localhost:9081/Corda_Network/localhost:10006#com.cordaSimpleApplication.flow.GetStateByKey:H --debug=true
  ```
- Query the value of the requested state (key) `H` in `network2` using the following:
  ```bash
  ./bin/fabric-cli chaincode query mychannel simplestate read '["H"]' --local-network=network2
  ```

### Fabric to Fabric

To test the scenario where `network1` requests the value of the state (key) `Arcturus` from `network2`, do the following:
- (_Make sure the following are running_: Fabric `network1`, relay, and driver; Fabric `network2`, relay, and driver)
- Navigate to the `samples/fabric/fabric-cli` folder.
- (Make sure you have configured `fabric-cli` as per earlier instructions)
- Run the following:
  ```bash
  ./bin/fabric-cli interop --key=Arcturus --local-network=network1 --requesting-org=Org1MSP localhost:9083/network2/mychannel:simplestate:Read:Arcturus
  ```
- Query the value of the requested state (key) `Arcturus` in `network1` using the following:
  ```bash
  ./bin/fabric-cli chaincode query mychannel simplestate read '["Arcturus"]' --local-network=network1
  ```

To test the scenario where `network2` requests the value of the state (key) `a` from `network1`, do the following:
- (_Make sure the following are running_: Fabric `network1`, relay, and driver; Fabric `network2`, relay, and driver)
- Navigate to the `samples/fabric/fabric-cli` folder.
- (Make sure you have configured `fabric-cli` as per earlier instructions)
- Run the following:
  ```bash
  ./bin/fabric-cli interop --key=a --local-network=network2 --requesting-org=Org1MSP localhost:9080/network1/mychannel:simplestate:Read:a
  ```
- Query the value of the requested state (key) `a` in `network2` using the following:
  ```bash
  ./bin/fabric-cli chaincode query mychannel simplestate read '["a"]' --local-network=network2
  ```
  
## Dockerized Deployment

### Corda to Fabric

To test the scenario where `Corda_Network` requests the value of the state (key) `a` from `network1`, do the following:
- Navigate to the `samples/corda/corda-simple-application` folder.
- Run the following:
```
./clients/build/install/clients/bin/clients request-state localhost:9081 relay-network1:9080/network1/mychannel:simplestate:Read:a
```
- Query the value of the requested state (key) `a` in `Corda_Network` using the following:
```
./clients/build/install/clients/bin/clients get-state a
```

To test the scenario where `Corda_Network` requests the value of the state (key) `Arcturus` from `network2`, do the following:
- Navigate to the `samples/corda/corda-simple-application` folder.
- Run the following:
```
./clients/build/install/clients/bin/clients request-state localhost:9081 relay-network2:9083/network2/mychannel:simplestate:Read:Arcturus
```
- Query the value of the requested state (key) `Arcturus` in `Corda_Network` using the following:
```
./clients/build/install/clients/bin/clients get-state Arcturus
```

### Fabric to Corda

To test the scenario where `network1` requests the value of the state (key) `H` from `Corda_Network`, do the following:
- Navigate to the `samples/fabric/fabric-cli` folder.
- (Make sure you have configured `fabric-cli` as per earlier instructions)
- Run the following:
```
./bin/fabric-cli interop --key=H --local-network=network1 --sign=true --requesting-org=Org1MSP relay-corda:9081/Corda_Network/corda_partya_1:10003#com.cordaSimpleApplication.flow.GetStateByKey:H --debug=true
```
- Query the value of the requested state (key) `H` in `network1` using the following (replace the Args with the Args value obtained in the previous command):
```
./bin/fabric-cli chaincode query mychannel simplestate read '["H"]' --local-network=network1
```

To test the scenario where `network2` requests the value of the state (key) `H` from `Corda_Network`, do the following:
- Navigate to the `samples/fabric/fabric-cli` folder.
- (Make sure you have configured `fabric-cli` as per earlier instructions)
- Run the following:
```
./bin/fabric-cli interop --key=H --local-network=network2 --sign=true --requesting-org=Org1MSP relay-corda:9081/Corda_Network/corda_partya_1:10003#com.cordaSimpleApplication.flow.GetStateByKey:H --debug=true
```
- Query the value of the requested state (key) `H` in `network2` using the following:
```
./bin/fabric-cli chaincode query mychannel simplestate read '["H"]' --local-network=network2
```

### Fabric to Fabric

To test the scenario where `network1` requests the value of the state (key) `Arcturus` from `network2`, do the following:
- Navigate to the `samples/fabric/fabric-cli` folder.
- (Make sure you have configured `fabric-cli` as per earlier instructions)
- Run the following:
```
./bin/fabric-cli interop --key=Arcturus --local-network=network1 --requesting-org=Org1MSP relay-network2:9083/network2/mychannel:simplestate:Read:Arcturus
```
- Query the value of the requested state (key) `Arcturus` in `network1` using the following:
```
./bin/fabric-cli chaincode query mychannel simplestate read '["Arcturus"]' --local-network=network1
```

To test the scenario where `network2` requests the value of the state (key) `a` from `network1`, do the following:
- Navigate to the `samples/fabric/fabric-cli` folder.
- (Make sure you have configured `fabric-cli` as per earlier instructions)
- Run the following:
```
./bin/fabric-cli interop --key=a --local-network=network2 --requesting-org=Org1MSP relay-network1:9080/network1/mychannel:simplestate:Read:a
```
- Query the value of the requested state (key) `a` in `network2` using the following:
```
./bin/fabric-cli chaincode query mychannel simplestate read '["a"]' --local-network=network2
```

