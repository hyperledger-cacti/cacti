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
  * _Identity Service_: A Fabric network needs to share its security group (or membership) configuration, i.e., its organizations' CA certificate chains, with a foreign network with which it seeks to interoperate. (You will need one service per channel.) Though such sharing can be implemented using several different mechanisms, ranging from manual to automated, the simplest and most modular way is to expose a REST endpoint that agents in foreign networks can reach. Further, this REST endpoint can be implemented as a standalone web application or it can be an extension of one or more of the existing Layer-2 applications. (Multiple apps can expose the same endpoint serving the same information for redundancy.) We will demonstrate an example of this while leaving other implementation modes to the user.
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
  * _Interoperation Helpers_: 

### Pre-Configuration

No changes are required in your network's pre-configuration process for Weaver enablement.

Typically, pre-configuration involves generating:
- _Channel artifacts_: orderer genesis block, channel transaction, and anchor peer configurations from a `configytx.yaml` file (using Fabric's `configtxgen` tool)
- _Crypto artifacts_: keys and certificates for CAs, peers, orderers, and clients from a `crypto-config.yaml` file (using Fabric's `cryptogen` tool)
- _Connection profiles_: one for every network organization, which will be used by the organization's Layer-2 applications to connect to the network's peers and CAs
Only a connection profile will be used by Weaver, as we will see later.

### Startup and Bootstrap

To launch a network using containerized components, you will typically use a Docker Compose or Kubernetes configuration file. No modifications are needed for the peers', orderers', and CAs' configurations.
