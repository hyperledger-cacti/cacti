---
id: fabric
title: Hyperledger Fabric
---

<!--
 Copyright IBM Corp. All Rights Reserved.

 SPDX-License-Identifier: CC-BY-4.0
 -->

After testing the Weaver interoperation mechanisms on [basic sample networks](../test-network/overview.md), you may be interested in finding out how you can equip an existing real network, whether in development or in production, to exercise these mechanisms. In this document, we will demonstrate how to equip a Fabric network and application with Weaver components and capabilities.

## Model

The figure below illustrates a typical Fabric network. The infrastructure consists of a set of peers, ordering service nodes, and CAs that perform the roles of MSPs; each serves a given _organization_ which is one of the constituent units of the network. On the peers are installed one or more smart contracts (_chaincode_), representing shared business logic across the different organizations. Further up lie the so-called Layer-2 applications that consist of organization-specific business logic and invoke the smart contracts using APIs exposed by the Fabric SDK and with wallet credentials issued by their respective organizations' CAs.

![alt text](../../../../static/enabling-weaver/fabric-network-model.png)

Such a network equipped with Weaver components and capabilities will look like the figure below. Legacy components are marked in grey and Weaver and bridging components in green.

![alt text](../../../../static/enabling-weaver/fabric-weaver-model.png)

The relay and driver are the only additional infrastructure that need to be installed. One or more relays can be installed, as can one or more drivers. The drivers are illustrated in Layer-2 rather than in the bottom layer because, though they are coupled with relays, they exercise contracts using the Fabric SDK and organization-issued credentials just like any Layer-2 application does.

Existing chaincode deployed on the network's channels remain undisturbed. All that is required in the smart contracts layer is the deployment of the Fabric Interoperation Chaincode on every channel that needs to offer or consume state from foreign networks.

Layer-2 applications will need some additional code and configuration because the decisions to exercise interoperation mechanisms (relay queries for data sharing or atomic asset exchanges) are strictly part of business logic. But Weaver's Fabric Interoperation Node SDK offers various helper functions to ease this process and keep the adaptation to a minimum, as we wil see later in this document. Finally, an _identity service_ must be offered by the network to expose its CAs' certificate chains to foreign networks, thereby laying the basis for interoperation. This service simply needs to offer a REST endpoint, and can be implemented as a standalone application or (more conveniently) as an augmentation of one or more of the existing Layer-2 applications.

## Procedure

Let us walk through the changes that are required in different phases of your network's creation.

### Development

A Fabric distributed application's business logic code spans two layers as illustrated in the network model:
- _Chaincode_: no code changes are required for Weaver enablement, as mentioned above
- _Layer-2 applications_: let us examine the adaptations required in detail:
  * **Identity Service**: A Fabric network needs to share its security group (or membership) configuration, i.e., its organizations' CA certificate chains, with a foreign network with which it seeks to interoperate. (You will need one service per channel.) Though such sharing can be implemented using several different mechanisms, ranging from manual to automated, the simplest and most modular way is to expose a REST endpoint that agents in foreign networks can reach. Further, this REST endpoint can be implemented as a standalone web application or it can be an extension of one or more of the existing Layer-2 applications. (Multiple apps can expose the same endpoint serving the same information for redundancy.) We will demonstrate an example of this while leaving other implementation modes to the user.
    Let's say a Fabric network consists of two organizations called `myorg1` and `myorg2`, each running a Layer-2 application with a web server whose URL prefixes are `http://myorg1.mynetwork.com:9000` and `http://myorg2.mynetwork.com:9000` respectively. For the configuration associated with the channel `mychannel`, each app exposes a REST endpoint (again, as an example) `http://myorg1.mynetwork.com:9000/mychannel/org_sec_group` and `http://myorg2.mynetwork.com:9000/mychannel/org_sec_group` respectively.
    At each web server's backend, you need to implement logic to retrieve the organization's MSP ID and its associated certificated chains. Sample code is given below for a JavaScript implementation built on `fabric-sdk-node`. You can use this code verbatim if your Layer-2 application is built on JavaScript or TypeScript, or port it to other languages (Java or Golang).
    ```javascript
    var express = require('express');
    var app = express();
    
    // This is boilerplate code your Layer-2 application is already likely to implement
    // 'userId' represents a wallet identity
    var getNetworkForOrgUser = async function(userId) {
        let wallet = await getWalletForOrg();
	    try {
		    const connectionOptions = { wallet: wallet, identity: userId, discovery: { enabled: true, asLocalhost: false } };
		    let gateway = new Gateway();
		    await gateway.connect(connectionProfile, connectionOptions);
		    const network = await gateway.getNetwork(channelName);
            return network;
	    } catch (error) {
            throw err;
	    }
    };
    
    // Logic to construct a security group structure for this organization
    // 'userId' represents a wallet identity
    var getSecurityGroupMspConfig = async function(userId) {
        const network = await getNetworkForOrgUser(userId);
        logger.info('Getting MSP Info for org: ' + org + '.');
        let mspConfig = network.getChannel().getMsp(mspId);
        let securityGroupMspConfig = {};
        securityGroupMspConfig.chain = [];
        if (Array.isArray(mspConfig.rootCerts)) {
            for (let i = 0; i < mspConfig.rootCerts.length ; i++) {
                securityGroupMspConfig.chain.push(mspConfig.rootCerts[i]);
            }
        } else if (mspConfig.rootCerts.length !== 0) {
            securityGroupMspConfig.chain.push(mspConfig.rootCerts);
        }
        if (Array.isArray(mspConfig.intermediateCerts)) {
            for (let i = 0; i < mspConfig.intermediateCerts.length ; i++) {
                securityGroupMspConfig.chain.push(mspConfig.intermediateCerts[i]);
            }
        } else if (mspConfig.intermediateCerts.length !== 0) {
            securityGroupMspConfig.chain.push(mspConfig.intermediateCerts);
        }
        securityGroupMspConfig.type = 'certificate';
        securityGroupMspConfig.value = '';
        let orgSecurityGroupConfig = {};
        orgSecurityGroupConfig[mspConfig.name] = securityGroupMspConfig;
        return orgSecurityGroupConfig;
    };
    
    // This is where the Express server endpoint is defined
    app.get('/:channelid/org_sec_group', async function(req, res) {
        var security_group_config = await getSecurityGroupMspConfig(<wallet-user-id>);      // Replace <wallet-user-id> with appropriate constant or variable
        res.setHeader('Content-Type', 'application/json')
        res.send(security_group_config);
    });
    ```
    Finally, each app exposes an identity service on the endpoints `http://myorg1.mynetwork.com:9000/sec_group` and `http://myorg2.mynetwork.com:9000/sec_group` respectively. Here is sample code for the app representing `myorg1`.
    ```javascript
    // Boilerplate HTTP GET request-response code
    const performGETTopologyRequest = async function(url) {
        return new Promise((resolve, reject) => {
            var opts = {};
            opts.url = url;
            opts.method = 'GET';
            opts.json = true;
            request(opts, function(error, res, data) {
                if (error) {
                    reject(error);
                }
                resolve({ statusCode: res.statusCode, response: res, body: data });
            });
        });
    };
    
    // This is where the Express server endpoint is defined
    app.get('/:channelid/sec_group', async function(req, res) {
        // Get local organization's security group configuration
        var security_group_config = await getSecurityGroupMspConfig(<wallet-user-id>);      // Replace <wallet-user-id> with appropriate constant or variable
        // Get other organizations' security group configurations by hitting their Layer-2 apps' REST endpoints
        otherApps = [ 'myorg2' ]    // Populate this list with other orgs' names
        for (let i = 0 ; i < otherApps.length ; i++) {
            const topology_json_url = 'http://' + otherApps[i] + '.mynetwork:9000/' + channelid + '/sec_group';
            let resp = await performGETTopologyRequest(topology_json_url);
            Object.assign(security_group_config, resp.body);
        }
        res.setHeader('Content-Type', 'application/json')
        res.send(security_group_config);
    });

    ```
    An agent from a foreign network can query either `http://myorg1.mynetwork.com:9000/sec_group` or `http://myorg2.mynetwork.com:9000/sec_group` and obtain the security group (or membership) configuration of the entire network.
  * **Interoperation Helpers**: Your Fabric network's Layer-2 applications have business logic embedded in them that, broadly speaking, accept data from users and other external agents and invoke smart contracts using library functions and APIs offered by the Fabric SDK. With the option of interoperability with other networks available through Weaver, other options can be added, namely requesting and accepting data from foreign networks, and triggering locks and claims for atomic exchanges spanning two networks. Weaver's Fabric Interoperation SDK (currently implemented both in Node.js and Golang) offers a library to exercise these options, supplementing the Fabric SDK. But this will involve modification to the application's business logic. The following examples will illustrate how you can adapt your applications.
    - _Data sharing_: Consider a scenario inspired by the [global trade use case](../../user-stories/global-trade.md) where a letter of credit (L/C) management business logic (chaincode `letterofcreditcc`) installed in the `tradefinancechannel` channel in the `trade-finance-network` network supports a transaction `RecordBillOfLading`, which validates and records a bill of lading (B/L) supplied by a user via a UI. Weaver will enable such a B/L to be fetched from a different network `trade-logistics-network` by querying the function `GetBillOfLading` exposed by the chaincode `shipmentcc` installed in the `tradelogisticschannel` channel.
      
      (In preparation, a suitable access control policy must be recorded on `tradelogisticschannel` in `trade-logistics-network`, and a suitable verification policy must be recorded on `tradefinancechannel` in `trade-finance-network`. We will see how to do this in the "Startup and Boostrap" section later.)
      
      You will need to insert some code in the Layer-2 application that accepts a B/L and submits a `RecordBillOfLading` transaction in `trade-finance-network`. (No code changes need to be made in any application in the other network.) The logic to accept a B/L should be replaced (or you can simply add an alternative) by a call to the `interopFlow` function offered by the [weaver-fabric-interop-sdk](https://github.com/hyperledger-labs/weaver-dlt-interoperability/packages/888424) library (there's an [equivalent library in Golang](https://github.com/hyperledger-labs/weaver-dlt-interoperability/releases/tag/sdks%2Ffabric%2Fgo-sdk%2Fv1.2.3-alpha.1) too). The following code sample illustrates this (the Golang equivalent is left to the reader):
      ```javascript
      const ihelper = require('@hyperledger-labs/weaver-fabric-interop-sdk').InteroperableHelper;
      const interopcc = <handle-to-fabric-interop-chaincode>;   // Use Fabric SDK functions: (new Gateway()).getNetwork(...).getContract(<fabric-interop-chaincode-id>)
      const keyCert = await ihelper.getKeyAndCertForRemoteRequestbyUserName(<wallet>, <user-id>);      // Read key and certificate for <user-id> from wallet (get handle using Fabric SDK Wallets API)
      // Collect view addresses for relay requests in the context of an interop flow
      interopJSONs.push({
          NetworkID: 'trade-logistics-network',
          RemoteEndpoint: <trade-logistics-relay-url[:<port>],      // Replace with remote network's relay address and port
          ChannelID: 'tradelogisticschannel',
          ChaincodeID: 'shipmentcc',
          ChaincodeFunc: 'GetBillOfLading',
          ccArgs: [ <shipment-reference> ],     // Replace <shipment-reference> with a value that can be used to look up the right B/L
          Sign: true
      });
      const indices = [ 1 ];
      // Trigger an end-to-end interoperation (data sharing) protocol
      // Send a request to a foreign network via your relay, receive the response and submit a transaction to a local chaincode
      const flowResponse = await ihelper.interopFlow(
          interopcc,
          'trade-finance-network',
          {
              channel: 'tradefinancechannel',
              contractName: 'letterofcreditcc',
              ccFunc: 'RecordBillOfLading',
              ccArgs: [ <shipment-reference> , '' ]
          },
          <org-msp-id>,                         // Replace with this Layer-2 application's organization's MSP ID
          <trade-finance-relay-url>[:<port>],   // Replace with local network's relay address and port
          indices,
          interopJSONs,
          keyCert
      );
      // List of errors to check for
      if (!flowResponse.views || flowResponse.views.length === 0 || !flowResponse.result || flowResponse.views.length !== argIndices.length) {
          throw <error>;
      }
      ```
      Let us understand this code snippet better. The structure in lines 156-161 specifies the local chaincode transaction that is to be triggered after remote data (view) has been requested and obtained via relays. The function `RecordBillOfLading` expects two arguments as specified in line 160: the first is the common shipment reference that is used by the letter of credit in `trade-finance-network` and the bill of lading in `trade-logistics-network`, and the second is the bill of lading contents. When the `interopFlow` function is called, this argument is left blank because it is supposed to be filled with contents obtained from a view request. The array list `indices`, which is passed as an argument to `interopFlow` therefore contains the index value `1` (line 150), indicating which argument ought to be substituted  with view data. The `interopJSONs` array correspondingly contains a list of view addresses that are to be supplied to the relay. (_Note_: a local chaincode invocation may require multiple view requests to different networks, which is why `indices` and `interopJSONs` are arrays; they therefore must have the same lengths.)

      The rest of the code ought to be self-explanatory. Values are hardcoded for explanation purposes, but you can refactor the above code by reading view addresses corresponding to chaincode invocations from a configuration file.

      You also need to add the following dependency to the `dependencies` section of your application's `package.json` file:
      ```json
      "@hyperledger-labs/weaver-fabric-interop-sdk": "latest",
      ```
      (Or check out the [package website](https://github.com/hyperledger-labs/weaver-dlt-interoperability/packages/888424) and select a different version.)

      Before you run `npm install` to fetch the dependencies, make sure you create a [personal access token](https://docs.github.com/en/github/authenticating-to-github/keeping-your-account-and-data-secure/creating-a-personal-access-token) with `read:packages` access in Github. Create an `.npmrc` file in the same folder as the `package.json` with the following contents:
      ```
      registry=https://npm.pkg.github.com/hyperledger-labs
      //npm.pkg.github.com/:_authToken=<personal-access-token>
      ```
      Replace `<personal-access-token>` in this file with the token you created in Github.
    - _Asset exchange_: _TBD_

### Pre-Configuration

No changes are required in your network's pre-configuration process for Weaver enablement.

Typically, pre-configuration involves generating:
- _Channel artifacts_: orderer genesis block, channel transaction, and anchor peer configurations from a `configtx.yaml` file (using Fabric's `configtxgen` tool)
- _Crypto artifacts_: keys and certificates for CAs, peers, orderers, and clients from a `crypto-config.yaml` file (using Fabric's `cryptogen` tool)
- _Connection profiles_: one for every network organization, which will be used by the organization's Layer-2 applications to connect to the network's peers and CAs

Only a connection profile will be used by Weaver, as we will see later.

### Startup and Bootstrap

To launch a network using containerized components, you will typically use a Docker Compose or Kubernetes configuration file. No modifications are needed to the peers', orderers', and CAs' configurations. Sample instructions are given below for networks launched using Docker Compose; we leave it to the reader to adapt these to their custom launch processes.

### Install the Fabric Interoperation Chaincode

Install the Fabric Interoperation Chaincode in the relevant channel(s), i.e., those that run smart contracts that will be involved in any interoperation mode. This is a Go module that can be fetched from `github.com/hyperledger-labs/weaver-dlt-interoperability/core/network/fabric-interop-cc/contracts/interop`. Following that, you an install it using the appropriate Fabric process: in Fabric v2, you will need to package, install, approve, and commit this module on the selected channels in your network.

#### Launch Relay

You can start a relay within a Docker container using a [pre-built image](https://github.com/hyperledger-labs/weaver-dlt-interoperability/pkgs/container/weaver-relay-server). You just need to customize the container configuration for your Fabric network, which you can do by simply creating a folder (let's call it `relay_config`) and configuring the following files in it:
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

  The `EXTERNAL_NETWORK` variable should be set to the [name](https://docs.docker.com/compose/networking/) of your Fabric network.

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
  cert_path="credentials/fabric_cert.pem"
  key_path="credentials/fabric_key"
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

  If you set `tls` to `true`, the relay will enforce TLS communication. The `cert_path` and `key_path` should point to a Fabric TLS certificate and key respectively, such as those created using the `cryptogen` tool.

  `<network-name>` is a unique identifier for your local network. You can set it to whatever value you wish.

  `<driver-name>` refers to the driver used by this relay to respond to requests. This also refers to one of the drivers's specifications in the `drivers` section further below. In this code snippet, we have defined one driver. (The names in lines 234 and 242 must match.) In lines 243 and 244, you should specify the hostname and port for the driver (whose configuration we will handle later). (_Note_: you can specify more than one driver instance in the `drivers` section.)

  The `relays` section specifies all foreign relays this relay can connect to. The `<foreign-relay-name>` value should be a unique ID for a given foreign relay, and this value will be used by your Layer-2 applications when constructing view addresses for data sharing requests. In lines 238 and 239, you should specify the hostname and port for the foreign relay. (_Note_: you can specify more than one foreign relay instance in the `relays` section.)
- `docker-compose.yaml`: This specifies the properties of the relay container. You can use the [file in the repository](https://github.com/hyperledger-labs/weaver-dlt-interoperability/blob/main/core/relay/docker-compose.yaml) verbatim.

To start the relay server, navigate to the folder containing the above files and run the following:
```bash
docker-compose up -d relay-server
```

#### Launch Driver

You can start a driver within a Docker container using a [pre-built image](https://github.com/hyperledger-labs/weaver-dlt-interoperability/pkgs/container/weaver-fabric-driver). You just need to customize the container configuration for your Fabric network, which you can do by simply creating a folder (let's call it `driver_config`) and configuring the following files in it:
- `.env`: This sets suitable environment variables within the driver container. Copy the `.env.template` file [from the repository](https://github.com/hyperledger-labs/weaver-dlt-interoperability/blob/main/core/relay/.env.template) and customize it for your purposes, as indicated in the below sample:
  ```
  CONNECTION_PROFILE=<path_to_connection_profile>
  DRIVER_CONFIG=./config.json
  RELAY_ENDPOINT=<relay-hostname>:<relay-port>
  NETWORK_NAME=<network-name>
  DRIVER_PORT=<driver-server-port>
  INTEROP_CHAINCODE=<interop-chaincode-name>
  EXTERNAL_NETWORK=<docker-bridge-network>
  DOCKER_IMAGE_NAME=weaver-fabric-driver
  DOCKER_TAG=1.2.4
  DOCKER_REGISTRY=ghcr.io/hyperledger-labs
  ```
  `<path_to_connection_profile>` should point to the path of a connection profile you generated in the "Pre-Configuration" section. A Fabric driver obtains client credentials from one of the organizations in your network, so pick an organization and point to the right connection profile.

  The `DRIVER_CONFIG` variable should point to the `config.json` (you can name this whatever you wish) specified below.

  `<relay-hostname>` should be set to the hostname of the relay server machine and `<relay-port>` should match the `port` value in the relay's `config.toml` (see above).

  The `NETWORK_NAME` variable should be a unique ID referring to the Fabric network. It will be used to distinguish container names and wallet paths. (This setting is relevant in situations where a driver is used to query multiple network channels.)

  The `DRIVER_PORT` variable should be set to the port this driver will listen on.

  The `INTEROP_CHAINCODE` variable should be set to the ID of the Fabric Interop Chaincode installed on your Fabric network channel.

  The `EXTERNAL_NETWORK` variable should be set to the [name](https://docs.docker.com/compose/networking/) of your Fabric network.
- `config.json`: This contains settings used to connect to a CA of a Fabric network organization and enroll a client. A sample is given below:
  ```json
  {
      "admin":{
          "name":"admin",
          "secret":"adminpw"
      },
      "relay": {
          "name":"relay",
          "affiliation":"<affiliation>",
          "role": "client",
          "attrs": [{ "name": "relay", "value": "true", "ecert": true }]
      },
      "mspId":"<msp-id>",
      "caUrl":"<ca-service-endpoint>"
  }
  ```
  As in the `.env` configuration, you should pick an organization for the driver to associate with. The `admin` section specifies the registrar name and password (this should be familiar to any Fabric network administrator) used to enroll clients. Default values of `admin` and `adminpw` are specified above as examples, which you should replace with the right values configured in your network organization's CA.

  `<affiliation>` should be what's specified in your organization's Fabric CA server configuration. The default is `org1.department1`, but you should look up the appropriate value from the CA server's configuration file.

  `<msp-id>` should be set to the (or an) MSP ID of the selected organization.

  `<ca-service-endpoint>` should be set to the CA server's endpoint. If you launched your CA server as a container from a docker-compose file, this should be set to the container's service name. (_Note_: if your connection profile already contains specifications for a CA server, you can leave this field empty.)
- `docker-compose.yaml`: This specifies the properties of the driver container. You can use the [file in the repository](https://github.com/hyperledger-labs/weaver-dlt-interoperability/blob/main/core/drivers/fabric-driver/docker-compose.yml) verbatim.

To start the driver, navigate to the folder containing the above files and run the following:
```bash
docker-compose up -d
```

#### Ledger Initialization

To prepare your network for interoperation with a foreign network, you need to record the following to your network channel through the Fabric Interoperation Chaincode:
- **Access control policies**:
  Let's take the example of the request made from `trade-finance-network` to `trade-logistics-network` for a B/L earlier in this document. `trade-logistics-network` can have a policy of the following form permitting access to the `GetBillOfLading` function from a client belonging to the `Exporter` organization in `trade-finance-network` as follows:
  ```json
  {
      "securityDomain":"trade-finance-network",
      "rules":
          [
              {
                  "principal":"ExporterMSP",
                  "principalType":"ca",
                  "resource":"tradelogisticschannel:shipmentcc:GetBillOfLading:*",
                  "read":true
              }
          ]
  }
  ```
  In this sample, a single rule is specified for requests coming from `trade-finance-network`: it states that a `GetBillOfLading` query made to the `shipmentcc` contract installed on the `tradelogisticschannel` channel is permitted for a requestor possessing credentials certified by an MSP with the `ExporterMSP` identity. The `*` at the end indicates that any arguments passed to the function will pass the access control check.

  You need to record this policy rule on your Fabric network's channel by invoking either the `CreateAccessControlPolicy` function or the `UpdateAccessControlPolicy` function on the Fabric Interoperation Chaincode that is already installed on that channel; use the former if you are recording a set of rules for the given `securityDomain` for the first time and the latter to overwrite a set of rules recorded earlier. In either case, the chaincode function will take a single argument, which is the policy in the form of a JSON string (make sure you escape the double quotes before sending the request to avoid parsing errors). You can do this in one of two ways: (1) writing a small piece of code in Layer-2 that invokes the contract using the Fabric SDK Gateway API, or (2) running a `peer chaincode invoke` command from within a Docker container built on the `hyperledger/fabric-tools` image. Either approach should be familiar to a Fabric practitioner.
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

  You need to record this policy rule on your Fabric network's channel by invoking either the `CreateVerificationPolicy` function or the `UpdateVerificationPolicy` function on the Fabric Interoperation Chaincode that is already installed on that channel; use the former if you are recording a set of rules for the given `securityDomain` for the first time and the latter to overwrite a set of rules recorded earlier. In either case, the chaincode function will take a single argument, which is the policy in the form of a JSON string (make sure you escape the double quotes before sending the request to avoid parsing errors). As with the access control policy, you can do this in one of two ways: (1) writing a small piece of code in Layer-2 that invokes the contract using the Fabric SDK Gateway API, or (2) running a `peer chaincode invoke` command from within a Docker container built on the `hyperledger/fabric-tools` image. Either approach should be familiar to a Fabric practitioner.

  **Note**: For any cross-network data request, make sure an access control policy is recorded in the _source network_ (`trade-logistics-network` in the above example) and a corresponding verification policy is recorded in the _destination network_ (`trade-finance-network` in the above example) before any relay request is triggered.
- **Foreign network security group (membership) configuration**:
  Run the following procedure (pseudocode) to record security group configuration for every foreign network you wish your Fabric network to interoperate with (you will need to collect the identity service URLs for all the foreign networks first):
  ```
  for each foreign network:
      send an HTTP GET request to the network's identity service (using 'curl' or 'wget' from a shell script or equivalent programming language APIs)
      invoke `CreateMembership` or `UpdateMembership` on the Fabric Interoperation Chaincode with the above HTTP response as argument
  ```
  As in the above two cases, use `CreateMembership` to record a confiuration for the first time for a given `securityDomain` and `UpdateMembership` to overwrite a configuration.

  _Note_: security group configurations (organization lists and their certificate chains) for any Fabric network channel are subject to change, so you should run the above procedure periodically in a loop.

Your Fabric network is now up and running with the necessary Weaver components, and your network's channel's ledger is bootstrapped with the initial configuration necessary for cross-network interactions!
