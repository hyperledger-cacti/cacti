<!--
 Copyright IBM Corp. All Rights Reserved.

 SPDX-License-Identifier: CC-BY-4.0
 -->

## Integration tests for `asset-exchange` using go-sdk
A sample of integration tests for asset-exchange can be exercised by running the file `exerciseSDK.go`.

Before executing `go run exerciseSDK.go`, please ensure that the below `keys` are populated appropriately in the network connection profile (e.g., in the network1 connection profile available at `../../../tests/network-setups/fabric/shared/network1/peerOrganizations/org1.network1.com/connection-org1.json`).
### keys in the connection profile `json` file: channels, orderers, certificateAuthorities

Sample content for the values of these keys can be found in the file `helpers/testdata/example/peerOrganizations/org1.example.com/connection-tls.json` (please note that the value of the key "certificateAuthorities"."ca.org1.example.com"."tlsCACerts"."pem" in this file is an array).

Also note that similar checks need to be carried out for the connection profile `yaml` file if you want to use the yaml file instead of json. Sample content for the values of these keys can be found in the file `helpers/testdata/example/peerOrganizations/org1.example.com/connection-tls.yaml`.

## Configurations

- Set the output of the below command as the value of the key `"members"."Org1MSP"."value"` in the file `data/credentials/network1/membership.json` (similarly for `network2`).
  ```bash
  awk 'NF {sub(/\r/, ""); printf "%s\\n",$0;}' ../../../tests/network-setups/fabric/shared/network1/peerOrganizations/org1.network1.com/peers/peer0.org1.network1.com/msp/cacerts/localhost-7054-ca-org1-network1-com.pem
  ```
- Set the chaincode value (e.g., `simplestate`) appropriately in the file `data/credentials/network1/access-control.json` (similarly for `network2`).
