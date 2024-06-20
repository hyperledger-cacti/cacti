<!--
 Copyright IBM Corp. All Rights Reserved.

 SPDX-License-Identifier: CC-BY-4.0
 -->

# Go SDK for Fabric

**NOTE:**
Due to namespace conflict between `fabric-protos-go` and `fabric-protos-go-apiv2`, use `GOLANG_PROTOBUF_REGISTRATION_CONFLICT=warn` flag when using go-sdk at runtime.


## Integration tests for `asset-exchange` using go-sdk
To run integration tests:
- First, [launch a pair of test networks](../../../tests/network-setups/fabric/dev/), one of which must be a Fabric network.
- Next, navigate to the [Go CLI](../../../samples/fabric/go-cli/) folder to run test scripts as per the below instructions.

Integration tests for data-sharing and asset-exchange are programmed in the file `exerciseSDK.go`. You can run this in either of the following ways:
- Compile the source using `go build -o ./bin/exerciseSDK exerciseSDK.go`, and then run the executable `./bin/exerciseSDK`.
- Build and run the executable using `go run exerciseSDK.go`.

Before running the tests, please ensure that the below `keys` are populated appropriately in the network connection profile (e.g., in the network1 connection profile available at `../../../tests/network-setups/fabric/shared/network1/peerOrganizations/org1.network1.com/connection-org1.json`).

### keys in the connection profile `json` file: channels, orderers, certificateAuthorities

Sample content for the values of these keys can be found in the file `helpers/testdata/example/peerOrganizations/org1.example.com/connection-tls.json` (please note that the value of the key "certificateAuthorities"."ca.org1.example.com"."tlsCACerts"."pem" in this file is an array).

Also note that similar checks need to be carried out for the connection profile `yaml` file if you want to use the yaml file instead of json. Sample content for the values of these keys can be found in the file `helpers/testdata/example/peerOrganizations/org1.example.com/connection-tls.yaml`.

### Testing membership manager functions

The [membership manager functions](./membershipmanager) are currently not covered by unit tests. As a temporary measure,below are instructions to test them in a standalone package as follows.
- Build the go-sdk.
- Start the Weaver testnet, e.g., by navigating to `<cacti-root>/weaver/tests/network-setups/fabric/dev` and running `make start-interop-local`.
- From go-sdk, Run (replace `<cacti-root>` with path to the cacti clone):
  ```bash
    cd membershipmanager
    GOLANG_PROTOBUF_REGISTRATION_CONFLICT=warn CACTI_ROOT=<cacti-root> go test -v .
  ```
  You should see membership contents in the output with no errors.

## Configurations

- Set the output of the below command as the value of the key `"members"."Org1MSP"."value"` in the file `data/credentials/network1/membership.json` (similarly for `network2`).
  ```bash
  awk 'NF {sub(/\r/, ""); printf "%s\\n",$0;}' ../../../tests/network-setups/fabric/shared/network1/peerOrganizations/org1.network1.com/peers/peer0.org1.network1.com/msp/cacerts/localhost-7054-ca-org1-network1-com.pem
  ```
- Set the chaincode value (e.g., `simplestate`) appropriately in the file `data/credentials/network1/access-control.json` (similarly for `network2`).
