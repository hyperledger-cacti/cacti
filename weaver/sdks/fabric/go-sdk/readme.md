<!--
 Copyright IBM Corp. All Rights Reserved.

 SPDX-License-Identifier: CC-BY-4.0
 -->

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
- Copy [membershipmanager/membership_manager.go](./membershipmanager/membership_manager.go) to an empty folder and rename the package to `main`.
- Add a `main` function with the following contents. These are samples, and you can tweak these as needed in your setup.
  ```go
  func main() {
    walletPath := "<path-to-folder-containing-wallet-identities>"    // e.g., <cacti-root>/weaver/samples/fabric/fabric-cli/src/wallet-network1/
    userName := "networkadmin"          // e.g., networkadmin
    connectionProfilePath := "<path-to-connection-profile-json>"    // e.g., <cacti-root>/weaver/tests/network-setups/fabric/shared/network1/peerOrganizations/org1.network1.com/connection-org1.docker.json"
    
    fmt.Printf("Get Recorded local Membership: ")
    member, _ := GetMembershipUnit(walletPath, userName, connectionProfilePath, "mychannel", "Org1MSP")
    fmt.Printf("%+v\n", member)

    fmt.Printf("Get MSP Configuration for Org2MSP: ")
    membership, _ := GetMSPConfigurations(walletPath, userName, connectionProfilePath, "mychannel", []string{"Org1MSP", "Org2MSP"})
    fmt.Printf("%+v\n", membership)

    fmt.Printf("Get All MSP Configuration for Org1MSP: ")
    membership, _ = GetAllMSPConfigurations(walletPath, userName, connectionProfilePath, "mychannel", []string{"Org1MSP"})
    fmt.Printf("%+v\n", membership)

    fmt.Printf("Create Local Membership: ")
    err := CreateLocalMembership(walletPath, userName, connectionProfilePath, "network1", "mychannel", "interop", []string{"Org1MSP"})
    fmt.Println(err)

    fmt.Printf("Update Local Membership: ")
    err = UpdateLocalMembership(walletPath, userName, connectionProfilePath, "network1", "mychannel", "interop", []string{"Org1MSP"})
    fmt.Println(err)

    fmt.Printf("Read Local Membership: ")
    m, err := ReadMembership(walletPath, userName, connectionProfilePath, "mychannel", "interop", "local-security-domain", []string{"Org1MSP"})
    fmt.Println(m)
    fmt.Println(err)

    fmt.Printf("Delete Local Membership: ")
    err = DeleteLocalMembership(walletPath, userName, connectionProfilePath, "mychannel", "interop", []string{"Org1MSP"})
    fmt.Println(err)
  }
  ```
- Build the program.
- Start the Weaver testnet, e.g., by navigating to `<cacti-root>/weaver/tests/network-setups/fabric/dev` and running `make start-interop-local`.
- Run the above program. You should see membership contents in the output with no errors.

## Configurations

- Set the output of the below command as the value of the key `"members"."Org1MSP"."value"` in the file `data/credentials/network1/membership.json` (similarly for `network2`).
  ```bash
  awk 'NF {sub(/\r/, ""); printf "%s\\n",$0;}' ../../../tests/network-setups/fabric/shared/network1/peerOrganizations/org1.network1.com/peers/peer0.org1.network1.com/msp/cacerts/localhost-7054-ca-org1-network1-com.pem
  ```
- Set the chaincode value (e.g., `simplestate`) appropriately in the file `data/credentials/network1/access-control.json` (similarly for `network2`).
