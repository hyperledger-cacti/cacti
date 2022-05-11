---
id: corda
title: Corda
---

<!--
 Copyright IBM Corp. All Rights Reserved.

 SPDX-License-Identifier: CC-BY-4.0
-->

After testing the Weaver interoperation mechanisms on [basic sample networks](../test-network/overview.md), you may be interested in finding out how you can equip an existing real network, whether in development or in production, to exercise these mechanisms. In this document, we will demonstrate how to equip a Corda network and application with Weaver components and capabilities.

## Model

The figure below illustrates a typical Corda network. The infrastructure consists of a set of nodes (each maintaining its share of the global state in a local vault), notaries, and CAs. On the nodes are installed one or more CorDapps, representing shared business logic across subsets of those nodes. The core of a CorDapp consists of a collection of workflows (or flows) and contracts acting on states; we layer the flows above the contracts in thebelow image just to illustrate that flows represent transaction (state update) triggers, and contract validations occur during the executions of flows. Further up in the stack lie client applications associated with CorDapps that can are used to trigger flows (and by implication, contracts).

![alt text](../../../../static/enabling-weaver/corda-network-model.png)

Such a network equipped with Weaver components and capabilities will look like the figure below. Legacy components are marked in grey and Weaver and bridging components in green.

![alt text](../../../../static/enabling-weaver/corda-weaver-model.png)

The relay and driver are the only additional infrastructure that need to be installed. One or more relays can be installed, as can one or more drivers. The drivers are illustrated in the client layer rather than in the bottom layer because, though they are coupled with relays, they trigger flows just like any client application does.

Existing CorDapp flows and contracts deployed on the network's nodes remain undisturbed. All that is required is the deployment of an Interoperation CorDapp (flows and contracts) on every node that needs to offer or consume state from foreign networks.

Client applications will need some additional code and configuration because the decisions to exercise interoperation mechanisms (relay queries for data sharing or atomic asset exchanges) are strictly part of business logic. But Weaver's Corda Interoperation Node SDK offers various helper functions to ease this process and keep the adaptation to a minimum, as we wil see later in this document. Finally, an _identity service_ must be offered by the network to expose its CAs' certificate chains to foreign networks, thereby laying the basis for interoperation. This service simply needs to offer a REST endpoint, and can be implemented as a standalone application or (more conveniently) as an augmentation of one or more of the existing client layer applications.

## Procedure

Let us walk through the changes that are required in different phases of your network's creation.

### Development

A Corda distributed application's business logic code spans three layers as illustrated in the network model:
- _Flows CorDapp_: no code changes are required for Weaver enablement, as mentioned above
- _Contracts CorDapp_: no code changes are required for Weaver enablement, as mentioned above
- _Client Layer applications_: let us examine the adaptations required in detail:
  * **Identity Service**: A Corda network needs to share its security domain (or membership) configuration, i.e., its nodes' CA certificate chains, with a foreign network with which it seeks to interoperate. Though such sharing can be implemented using several different mechanisms, ranging from manual to automated, the simplest and most modular way is to expose a REST endpoint that agents in foreign networks can reach. Further, this REST endpoint can be implemented as a standalone web application or it can be an extension of one or more of the existing client layer applications. (Multiple apps can expose the same endpoint serving the same information for redundancy.) We will demonstrate an example of this while leaving other implementation modes to the user.
    Let's say a Corda network consists of two nodes called `PartyA` and `PartyB`, each running a client layer application with a web server whose URL prefixes are `http://partya.mynetwork.com:9000` and `http://partyb.mynetwork.com:9000` respectively. Each app then can expose a REST endpoint (again, as an example) `http://partya.mynetwork.com:9000/node_sec_grp` and `http://partyb.mynetwork.com:9000/node_sec_grp` respectively.
    At each web server's backend, you need to implement logic to retrieve the node's ID and it's associated certificated chains. Sample code is given below for a Kotlin implementation built on `weaver-corda-sdk`. You can use this code verbatim, except for some minor changes like `<path-to-root-corda-net-folder>`, other parameters like security domain, and list of names of nodes as appropriate for your environment:
    
    ```kotlin
    import com.weaver.corda.sdk.CredentialsCreator
    import com.google.protobuf.util.JsonFormat
    
    
    @RestController
    @CrossOrigin
    @RequestMapping("/") // The paths for HTTP requests are relative to this base path.
    class Controller {
        // Expose "node_sec_grp" endpoint using Rest Controller
        @RequestMapping(value = ["/node_sec_grp"], method = arrayOf(RequestMethod.GET), produces = arrayOf("application/json"))
        private fun GetNetworkConfig(): String {
            val jsonPrinter = JsonFormat.printer().includingDefaultValueFields()
            
            val credentialsCreator = CredentialsCreator(
                "<path-to-root-corda-net-folder>/build/nodes",
                "mynetwork", // security domain name
                ["PartyA", "PartyB"], // list of nodes 
                "", 
                ""
            )
            
            // Generate Membership
            val membership = credentialsCreator.createMembership()
            return jsonPrinter.print(membership)
        }
    }
    ```
    An agent from a foreign network can query either `http://partya.mynetwork.com:9000/sec_group` or `http://partyb.mynetwork.com:9000/sec_group` and obtain the security domain (or membership) configuration of the entire network.
  * **Interoperation Helpers**: Your Corda network's client layer applications have business logic embedded in them that, broadly speaking, accept data from users and other external agents and invoke workflows. With the option of interoperability with other networks available through Weaver, other options can be added, namely requesting and accepting data from foreign networks, and triggering locks and claims for atomic exchanges spanning two networks. Weaver's Corda SDK (currently implemented both in Java and Kotlin) offers a library to exercise these options. But this will involve modification to the application's logic. The following examples will illustrate how you can adapt your applications.
    - _Data sharing_: Consider a scenario inspired by the [global trade use case](../../user-stories/global-trade.md) where a letter of credit (L/C) management business logic is installed in the `trade-finance-network` network, supports a flow named `UploadBillOfLading`, which validates and records a bill of lading (B/L) supplied by a user via a UI. Weaver will enable such a B/L to be fetched from a different network `trade-logistics-network` by querying the function `GetBillOfLading` exposed by the chaincode `shipmentcc` installed in the `tradelogisticschannel` channel (_The trade logistics network can be built on Corda as well. The steps for Weaver-enablement will mostly be the same, with the exception of view address creation logic. Here, for demonstration purposes, we assume that that counter-party network is built on Fabric_).
      
        (In preparation, a suitable access control policy must be recorded on `tradelogisticschannel` in `trade-logistics-network`, and a suitable verification policy must be recorded in the vault of `trade-finance-network`. We will see how to do this in the [Startup and Bootstrap Weaver Components](#startup-and-bootstrap-weaver-components) section later.)

        You will need to insert some code in the client layer application that accepts a B/L and submits a `UploadBillOfLading` request in `trade-finance-network`. (No code changes need to be made in any application in the other network.) The logic to accept a B/L should be replaced (or you can simply add an alternative) by a call to the `InteroperableHelper.interopFlow` function offered by the [weaver-corda-sdk](https://github.com/hyperledger-labs/weaver-dlt-interoperability/packages/952245) library. The following code sample illustrates this:
      
        ```kt
        import com.weaver.corda.sdk.InteroperableHelper
        import com.mynetwork.flow.UploadBillOfLading

        val viewAddress = InteroperableHelper.createFabricViewAddress(
            'trade-logistics-network',               // Security Domain/Group
            <trade-logistics-relay-url[:<port>],     // Replace with remote network's relay
            'tradelogisticschannel',                 // Remote network's channel
            'shipmentcc',                            // Remote network's cc
            'GetBillOfLading',                       // Remote network's cc Fun
            [ <shipment-reference> ]                 // Replace <shipment-reference> with a value that can be used to look up the right B/L
        )
        try {
            val response = InteroperableHelper.interopFlow(
                proxy,                                // CordaRPCOps instance to start flows
                viewAddress,
                <trade-finance-relay-url>[:<port>]   // Replace with local network's relay address and port
            ).fold({
                println("Error in Interop Flow: ${it.message}")
            }, {
                val linearId = it.toString()
                val BoLString = InteroperableHelper.getExternalStatePayloadString(
                    proxy,
                    linearId
                )
                val result = proxy.startFlow(::UploadBillOfLading, BoLString)
                println("$result")
            }
        } catch (e: Exception) {
            println("Error: ${e.toString()}")
        }
        ```
        
        Let us understand this code snippet better. The function `UploadBillOfLading` expects one argument, the bill of lading contents. The `InteroperableHelper.createFabricViewAddress` is used to create view address that is to passed to `InteroperableHelper.interopFlow` function. The equivalent function to create a view address for a remote Corda network is `InteroperableHelper.createCordaViewAddress`. 
        
        The rest of the code ought to be self-explanatory. Values are hardcoded for explanation purposes.
        
        You need to create a [personal access token](https://docs.github.com/en/github/authenticating-to-github/keeping-your-account-and-data-secure/creating-a-personal-access-token) with `read:packages` access in Github, to access weaver packages.
        You also need to add the following to your application's `build.gradle` file:
        ```groovy
        repositories {
            maven {
                url https://maven.pkg.github.com/hyperledger-labs/weaver-dlt-interoperability
                credentials {
                    username <github-email>
                    password <github-personal-access-token>
                }
            }
        }
        dependencies {
            implementation(group: 'com.weaver.corda.sdk', name: 'weaver-corda-sdk', version: "1.2.3")
            implementation(group: 'com.weaver.corda.app.interop', name: 'interop-contracts', version: "1.2.3")
            implementation(group: 'com.weaver.corda.app.interop', name: 'interop-workflows', version: "1.2.3")
            implementation(group: 'com.weaver', name: 'protos-java-kt', version: "1.2.3")
        }
        ```
      (Or check out the [package website](https://github.com/hyperledger-labs/weaver-dlt-interoperability/packages/952245) and select a different version.)
    - _Asset exchange_: _TBD_

### Pre-Configuration

No changes are required in your network's pre-configuration process for Weaver enablement.

Typically, pre-configuration involves:

* _Bootstraping Network_:
    Generating node folders for each participating node in the network, which contains CorDapps, certificates,  persistence db, etc sub directories. Using Gradle task `net.corda.plugins.Cordform` or `net.corda.plugins.Dockerform`, the folders get created under the directory `build/nodes` (this path is used in above sample code for Identity Service).
    
    The RPC address, username and password specified in above task will be used to create an instance of `CordaRPCOps`, which is the first argument for most `weaver-corda-sdk` static functions as we saw in previous section. For example, one of them is `InteroperableHelper.interopFlow`:
    ```kotlin
    val response = InteroperableHelper.interopFlow(
        proxy,                                // CordaRPCOps instance to start flows
        viewAddress,
        <trade-finance-relay-url>[:<port>],   // Replace with local network's relay address and port
    )
    ```
    Also, the Corda Driver (which we will setup in the following sections) needs a specific RPC user to be created, so make sure to add that in the Gradle task above, and note the credentials.

    Sample `net.corda.plugins.Dockerform` task:
    ```groovy
    task prepareDockerNodes(type: net.corda.plugins.Dockerform, dependsOn: ['jar']) {
        def HOST_ADDRESS = "0.0.0.0"
        nodeDefaults {
            projectCordapp {
                deploy = false
            }
        }
        node {
            name "O=Notary,L=London,C=GB"
            notary = [validating : true]
            p2pPort 10004
            rpcSettings {
                address("$HOST_ADDRESS:10003")
                adminAddress("$HOST_ADDRESS:10005")
            }
            cordapps.clear()
        }
        node {
            name "O=PartyA,L=London,C=GB"
            p2pPort 10007
            rpcSettings {
                address("$HOST_ADDRESS:10003")
                adminAddress("$HOST_ADDRESS:10005")
            }
            rpcUsers = [
                    [ user: "user1", "password": "test", "permissions": ["ALL"]],
                    [ user: "driverUser1", "password": "test", "permissions": ["ALL"]]] // <-- Driver RPC User
        }
        node {
            name "O=PartyB,L=London,C=GB"
            p2pPort 10009
            rpcSettings {
                address("$HOST_ADDRESS:10003")
                adminAddress("$HOST_ADDRESS:10005")
            }
            rpcUsers = [
                    [ user: "user1", "password": "test", "permissions": ["ALL"]],
                    [ user: "driverUser1", "password": "test", "permissions": ["ALL"]]] // <-- Driver RPC User
        }
    }
    ```

* _Install Interoperation CorDapp on Nodes_: After bootstrapping the nodes folder, copy the following two CorDapps in `build/nodes/PartyA/cordapps` and `build/nodes/PartyB/cordapps` folders (`PartyA` and `PartyB` node names are for example only):
    - [com.weaver.corda.app.interop.interop-contracts](https://github.com/hyperledger-labs/weaver-dlt-interoperability/packages/906215)
    - [com.weaver.corda.app.interop.interop-workflows](https://github.com/hyperledger-labs/weaver-dlt-interoperability/packages/906216)

  | Notes |
  |:------|
  | You can follow any installation process for this CorDapp, but make sure it is installed on all the nodes that maintain the states involved in cross-network operations in their vaults. |

### Startup and Bootstrap Weaver components

To launch a network using containerized components, you will typically use a Docker Compose or Kubernetes configuration file. No modifications are needed to the node's configurations. Sample instructions are given below for networks launched using Docker Compose; we leave it to the reader to adapt these to their custom launch processes.

#### Launch Relay

You can start a relay within a Docker container using a [pre-built image](https://github.com/hyperledger-labs/weaver-dlt-interoperability/pkgs/container/weaver-relay-server). You just need to customize the container configuration for your Corda network, which you can do by simply creating a folder (let's call it `relay_config`) and configuring the following files in it:
- `.env`: This sets suitable environment variables within the relay container. Copy the `.env.template` file [from the repository](https://github.com/hyperledger-labs/weaver-dlt-interoperability/blob/main/core/relay/.env.template) and customize it for your purposes, as indicated in the below sample:
  ```
  PATH_TO_CONFIG=./config.toml
  RELAY_NAME=<"name" in config.toml>
  RELAY_PORT=<relay-server-port/"port" in config.toml>
  EXTERNAL_NETWORK=<docker-bridge-network>
  DOCKER_REGISTRY=ghcr.io/hyperledger-labs
  DOCKER_IMAGE_NAME=weaver-relay
  DOCKER_TAG=1.2.4
  ```
  The `PATH_TO_CONFIG` variable should point to the `config.toml` (you can name this whatever you wish) specified below.

  The `RELAY_NAME` variable specifies a unique name for this relay. It should match what's specified in the `config.toml` (more on that below).

  The `RELAY_PORT` variable specifies the port this relay server will listen on. It should match what's specified in the `config.toml` (more on that below).

  The `EXTERNAL_NETWORK` variable should be set to the [name](https://docs.docker.com/compose/networking/) of your Corda network.

  The `DOCKER_*` variables are used to specify the image on which the container will be built. Make sure you set `DOCKER_TAG` to the latest version you see on [Github](https://github.com/hyperledger-labs/weaver-dlt-interoperability/pkgs/container/weaver-relay-server).

  For more details, see the [Relay Docker README](https://github.com/hyperledger-labs/weaver-dlt-interoperability/blob/main/core/relay/relay-docker.md) ("Relay Server Image" and "Running With Docker Compose" sections).
- `config.toml`: This specifies properties of the relay and the driver(s) is associates with. A sample is given below:
  ```
  name=<relay-name>
  port=<relay-port>
  host="0.0.0.0"
  db_path="db/<relay-name>/requests"
  remote_db_path="db/<relay-name>/remote_request"

  # FOR TLS
  cert_path="credentials/cert.pem"
  key_path="credentials/key"
  tls=<true/false>

  [networks]
  [networks.<network-name>]
  network="<driver-name>"

  [relays]
  [relays.<foreign-relay-name>]
  hostname="<foreign-relay-hostname-or-ip-address>"
  port="<foreign-relay-port>"

  [drivers]
  [drivers.<driver-name>]
  hostname="<driver-hostname-or-ip-address>"
  port="<driver-port>"
  ```
  `<relay-name>` should be a unique ID representing this relay; e.g., `my_network_relay`. It should match the `RELAY_NAME` value in `.env`.

  `<relay-port>` is the port number the relay server will listen on. It should match the `RELAY_PORT` value in `.env`.

  `db_path` and `remote_db_path` are used internally by the relay to store data. Replace `<relay-name>` with the same value set for the `name` parameter. (These can point to any filesystem paths in the relay's container.)

  If you set `tls` to `true`, the relay will enforce TLS communication. The `cert_path` and `key_path` should point to a Corda TLS certificate and key respectively.

  `<network-name>` is a unique identifier for your local network. You can set it to whatever value you wish.

  `<driver-name>` refers to the driver used by this relay to respond to requests. This also refers to one of the drivers's specifications in the `drivers` section further below. In this code snippet, we have defined one driver. Under `[drivers.<driver-name>]`, you should also specify the hostname and port for the driver (whose configuration we will handle later).

  The `relays` section specifies all foreign relays this relay can connect to. The `<foreign-relay-name>` value should be a unique ID for a given foreign relay, and this value will be used by your client layer applications when constructing view addresses for data sharing requests. Under `[relays.<foreign-relay-name>]`, you should specify the hostname and port for the foreign relay.

  | Notes |
  |:------|
  | You can specify more than one driver instance in the `drivers` section. |
  | You can specify more than one foreign relay instance in the `relays` section. |
- `docker-compose.yaml`: This specifies the properties of the relay container. You can use the [file in the repository](https://github.com/hyperledger-labs/weaver-dlt-interoperability/blob/main/core/relay/docker-compose.yaml) verbatim.

To start the relay server, navigate to the folder containing the above files and run the following:
```bash
docker-compose up -d relay-server
```

#### Launch Driver

You can start a driver within a Docker container using a [pre-built image](https://github.com/hyperledger-labs/weaver-dlt-interoperability/pkgs/container/weaver-corda-driver). You just need to customize the container configuration for your Corda network, which you can do by simply configuring the following:
- `.env`: This sets suitable environment variables within the driver container. Copy the `.env.template` file [from the repository](https://github.com/hyperledger-labs/weaver-dlt-interoperability/blob/main/core/relay/.env.template) and customize it for your purposes, as indicated in the below sample:
  ```
  NETWORK_NAME=<container-name-suffix>
  DRIVER_PORT=<driver-server-port>
  DRIVER_RPC_USERNAME=<driver-rpc-username>
  DRIVER_RPC_PASSWORD=<driver-rpc-username>
  EXTERNAL_NETWORK=<docker-bridge-network>
  DOCKER_IMAGE_NAME=ghcr.io/hyperledger-labs/weaver-corda-driver
  DOCKER_TAG=1.2.4-alpha.7
  ```
  The `NETWORK_NAME` is only used as suffix for container and has no other significance.
  
  The `DRIVER_PORT` variable should be set to the port this driver will listen on.
  
  The `DRIVER_RPC_USERNAME` variable should be set to rpc user created [above](#pre-configuration) for the driver.
  
  The `DRIVER_RPC_PASSWORD` variable should be set to password of above rpc user.
  
  The `EXTERNAL_NETWORK` variable should be set to the [name](https://docs.docker.com/compose/networking/) of your Corda network.
- `docker-compose.yaml`: This specifies the properties of the driver container. You can use the [file in the repository](https://github.com/hyperledger-labs/weaver-dlt-interoperability/blob/main/core/drivers/corda-driver/docker-compose.yml) verbatim.

To start the driver, navigate to the folder containing the above files and run the following:
```bash
docker-compose up -d
```

#### Vault Initialization

To prepare your network for interoperation with a foreign network, you need to record the following to your vault using the [Corda SDK](https://github.com/hyperledger-labs/weaver-dlt-interoperability/packages/952245) (`com.weaver.corda.sdk`):
- **Access control policies**:
  Let's take the example of the request made from `trade-finance-network` to `trade-logistics-network` for a B/L earlier in this document. `trade-logistics-network` can have a policy of the following form permitting access to the `GetBillOfLading` function from a client representing the `PartyA` node in `trade-finance-network` as follows:
  ```json
  {
      "securityDomain":"trade-finance-network",
      "rules":
          [
              {
                  "principal":"<PartyA-certificate-pem>",
                  "principalType":"certificate",
                  "resource":"exporternode:10003;carriernode:10003#com.mynetwork.flow.GetBillOfLading:*",
                  "read":true
              }
          ]
  }
  ```
  In this sample, a single rule is specified for requests coming from `trade-finance-network`: it states that a workflow call to `com.mynetwork.flow.GetBillOfLading` made to `exporter` and `carrier` nodes of remote Corda network is permitted for a requestor whose certificate is specified in the `principal` attribute. The `*` at the end indicates that any arguments passed to the function will pass the access control check. The `exporternode:10003` and `carriernode:10003` are of form `<hostname/IP>:<RPC_Port>`, for `exporter` and `carrier` nodes respectively in the remote Corda network.

  You need to record this policy rule on your Corda network's vault by invoking either the `AccessControlPolicyManager.createAccessControlPolicyState` function or the `AccessControlPolicyManager.updateAccessControlPolicyState` function on the `weaver-corda-sdk`; use the former if you are recording a set of rules for the given `securityDomain` for the first time and the latter to overwrite a set of rules recorded earlier. The above JSON needs to be converted to protobuf object of `com.weaver.protos.common.access_control.AccessControl.AccessControlPolicy`, using google's protobuf library, and the object is the second argument of above functions (first being the instance of CordaRPCOps).
  
- **Verification policies**:
  Taking the same example as above, an example of a verification policy for a B/L requested by the `trade-finance-network` from the `trade-logistics-network` is as follows:
  ```json
  {
      "securityDomain":"trade-logistics-network",
      "identifiers":
          [
              {
                  "pattern":"tradelogisticschannel:shipmentcc:GetBillOfLading:*",
                  "policy":
                      {
                          "type":"Signature",
                          "criteria":
                              [
                                  "ExporterMSP",
                                  "CarrierMSP"
                              ]
                      }
              }
          ]
  }
  ```
  In this sample, a single verification policy rule is specified for data views coming from `trade-logistics-network`: it states that the data returned by the `GetBillOfLading` query made to the `shipmentcc` chaincode on the `tradelogisticschannel` channel requires as proof two signatures, one from a peer in the organization whose MSP ID is `ExporterMSP` and another from a peer in the organization whose MSP ID is `CarrierMSP`.

  | Notes |
  |:------|
  | If the remote network is built on Corda, the resource specified in the access control policy can be used here as the `pattern`, with different node names specified in the `criteria`. |

  You need to record this policy rule on your Corda network's vault by invoking Corda sdk's function `VerificationPolicyManager.createVerificationPolicyState(proxy, verificationPolicyProto)`, where `proxy` is an instance of `CordaRPCOps` as described in previous sections, and `verificationPolicyProto` is an object of protobuf `com.weaver.protos.common.verification_policy.VerificationPolicyOuterClass.VerificationPolicy`. You can examine the full proto structure [here](https://github.com/hyperledger-labs/weaver-dlt-interoperability/blob/main/common/protos/common/verification_policy.proto). (_Google's protobuf library can be used to convert above JSON to protobuf object._)

  | Notes |
  |:------|
  | For any cross-network data request, make sure an access control policy is recorded in the _source network_ (`trade-logistics-network` in the above example) and a corresponding verification policy is recorded in the _destination network_ (`trade-finance-network` in the above example) before any relay request is triggered. |
- **Foreign network security domain (membership) configuration**:
  Run the following procedure (pseudocode) to record security domain configuration for every foreign network you wish your Corda network to interoperate with (you will need to collect the identity service URLs for all the foreign networks first):
  ```
  for each foreign network:
      send an HTTP GET request to the network's identity service (using 'curl' or 'wget' from a shell script or equivalent programming language APIs).
      convert the response string to protobuf object of 'com.weaver.protos.common.membership.MembershipOuterClass.Membership'.
      invoke 'MembershipManager.createMembershipState(proxy, membershipProto)' or 'MembershipManager.updateMembershipState(proxy, membershipProto)' on Corda sdk.
  ```
  As in the above two cases, use `createMembershipState` to record a confiuration for the first time for a given `securityDomain` and `updateMembershipState` to overwrite a configuration.

  | Notes |
  |:------|
  | Security domain configurations (organization lists and their certificate chains) for any Fabric/Corda network are subject to change, so you should run the above procedure periodically in a loop. |

Your Corda network is now up and running with the necessary Weaver components, and your network's vault is bootstrapped with the initial configuration necessary for cross-network interactions!


<!-- 
[Some text for enabling TLS, uncomment it when TLS is fully implemented. Planning to release version 1.2.4 along with doc update. Current doc works fine with version 1.2.3 specified below.]

By default, the TLS is set to false in `interopFlow`, i.e. disabled. But if you want to enable TLS, can pass additional parameters to the `interopFlow` function as follows:
```kt
val response = InteroperableHelper.interopFlow(
    proxy,                                // CordaRPCOps instance to start flows
    viewAddress,
    <trade-finance-relay-url>[:<port>],   // Replace with local network's relay address and port
    'trade-finance-network',              // Local network name (destination)
    true,                                 // Boolean indication TLS is enabled.
    <relayTlsTrustStorePath>              // JKS file path containing relay server TLS CA certificates
    <relayTlsTrustStorePassword>,         // password used to create the JKS file
)
```
OR
```kt
val response = InteroperableHelper.interopFlow(
    proxy,                                // CordaRPCOps instance to start flows
    viewAddress,
    <trade-finance-relay-url>[:<port>],   // Replace with local network's relay address and port
    'trade-finance-network',              // Local network name (destination)
    true,                                 // Boolean indication TLS is enabled.
    <tlsCACertPathsForRelay>,             // colon-separated list of CA certificate file paths
)
```
-->
