---
id: fabric
title: Enabling Weaver in a Fabric Network and Application
---

<!--
 Copyright IBM Corp. All Rights Reserved.

 SPDX-License-Identifier: CC-BY-4.0
 -->

After testing the Weaver interoperation mechanisms on [toy networks](../test-network/overview.md), you may be interested in finding out how you can equip an existing real network, whether in development or in production, to exercise these mechanisms. In this document, we will demonstrate how to equip a Fabric network and application with Weaver components and capabilities.

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
    ```
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
    ```
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
    - _Data sharing_: Consider a scenario inspired by the [global trade use case](../../user-stories/global-trade.md) where a chaincode `letterofcreditcc` installed in the `tradefinancechannel` channel in the `trade-finance-network` network supports a transaction `RecordBillOfLading`, which validates and records a bill of lading (B/L) supplied by a user via a UI. Weaver will enable such a B/L to be fetched from a different network `trade-logistics-network` by querying the function `GetBillOfLading` exposed by the chaincode `shipmentcc` installed in the `tradelogisticschannel`.
      
      (In preparation, a suitable access control policy must be recorded on `tradelogisticschannel` in `trade-logistics-network`, and a suitable verification policy must be recorded on `tradefinancechannel` in `trade-finance-network`. We will see how to do this in the "Startup and Boostrap" section later.)
      
      You will need to insert some code in the Layer-2 application that accepts a B/L and submits a `RecordBillOfLading` transaction in `trade-finance-network`. (No code changes need to be made in any application in the other network.) The logic to accept a B/L should be replaced (or you can simply add an alternative) by a call to the `interopFlow` function offered by the [weaver-fabric-interop-sdk](https://github.com/hyperledger-labs/weaver-dlt-interoperability/packages/888424) library (there's an [equivalent library in Golang](https://github.com/hyperledger-labs/weaver-dlt-interoperability/releases/tag/sdks%2Ffabric%2Fgo-sdk%2Fv1.2.3-alpha.1) too). The following code sample illustrates this (the Golang equivalent is left to the reader):
      ```
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
      Let us understand this code snippet better. The structure in lines 156-161 specifies the local chaincode transaction that is to be triggered after remote data (view) has been requested and obtaind via relays. The function `RecordBillOfLading` expects two arguments as specified in line 160: the first is the common shipment reference that is used by the letter of credit in `trade-finance-network` and the bill of lading in `trade-logistics-network`, and the second is the bill of lading contents. When the `interopFlow` function is called, this argument is left blank because it is supposed to be filled with contents obtained from a view request. The array list `indices`, which is passed as an argument to `interopFlow` therefore contains the index value `1` (line 150), indicating which argument ought to be substituted  with view data. The `interopJSONs` array correspondingly contains a list of view addresses that are to be supplied to the relay. (_Note_: a local chaincode invocation may require multiple view requests to different networks, which is why `indices` and `interopJSONs` are arrays; they therefore must have the same lengths.)

      The rest of the code ought to be self-explanatory. Values are hardcoded for explanation purposes, but you can refactor the above code by reading view addresses corresponding to chaincode invocations from a configuration file.
    - _Asset exchange_: _TBD_

### Pre-Configuration

No changes are required in your network's pre-configuration process for Weaver enablement.

Typically, pre-configuration involves generating:
- _Channel artifacts_: orderer genesis block, channel transaction, and anchor peer configurations from a `configytx.yaml` file (using Fabric's `configtxgen` tool)
- _Crypto artifacts_: keys and certificates for CAs, peers, orderers, and clients from a `crypto-config.yaml` file (using Fabric's `cryptogen` tool)
- _Connection profiles_: one for every network organization, which will be used by the organization's Layer-2 applications to connect to the network's peers and CAs

Only a connection profile will be used by Weaver, as we will see later.

### Startup and Bootstrap

To launch a network using containerized components, you will typically use a Docker Compose or Kubernetes configuration file. No modifications are needed for the peers', orderers', and CAs' configurations.
