_This is part of the main [documentation](../main/index.hmtl)_

We implemented an example using our Fabric and Quorum plugins to showcase a simple use case where we prove the retirement of an asset from one blockchain in another one and trigger actions in the receiving blockchain based on this new piece of information. This example proposes to setup Fabric Blockchain with a simple smart contract using the Fabric SDK and a Quorum Blockchain with a similar logic using a custom API. On top of that setup, we deploy our two federations of validators connected to specific nodes on respective Blockchains. 3 scenarios are available to test simple workflows on the deployed system.

### Prerequisites

- [Docker](https://docs.docker.com/install/)
- [Docker-compose](https://docs.docker.com/compose/install/)
- [Node.js](https://nodejs.org/en/download/) npm >= 5.6 & node >= 8.9
- [Fabric1.4](https://hyperledger-fabric.readthedocs.io/en/release-1.4/)
- [JDK 8](http://www.oracle.com/technetwork/java/javase/downloads/jdk8-downloads-2133151.html)

Note: Fabric SDK has stricter engine requirements (npm < 6.0 & node < 9.0)

The scripts and following commands have only been tested on Ubuntu 18.04

You can use [configure.sh](../../packages/core/tools/configure.sh) to automatically install the prerequisites to the new Ubuntu host.

### Setup

Since the example runs on Hyperledger Fabric and Quorum, we'll first need to install and run local networks for both. Considering that we need to run 2 or more DLTs, the preferred setup for the demo is in Docker containers and we don't provide support for manual install just yet. We are gonna deploy 2 dockerised Blockchains with 4 nodes each plus the federations, it can prove power intensive for a single machine, we recommend deploying the environments in different machines: e.g. Fabric Blockchain and federation on one machine and Quorum Blockchain and federation in another one.

Navigate to the example folder: ``cd examples/simple-asset-transfer``
Install npm dependencies: ``npm i``
Navigate to the example Fabric API folder: ``cd example/simple-asset-transfer/fabric/api``
Install npm dependencies: ``npm i``
Navigate to the example Quorum API folder: ``cd example/simple-asset-transfer/quorum/api``
Install npm dependencies: ``npm i``

Check example package.json for available commands. In simple-asset-transfer folder: ``cat package.json``

#### Fabric Blockchain

To run the Fabric Blockchain, you can use the folowing scripts:
First build the API server container image by running `npm run fabric:api:build` and then execute ``npm run fabric``
This will automatically pull the necessary images for Fabric nodes and run an environment of 4 nodes partitioned in 2 organizations within the same channel as well as the Fabric SDK listening on port 4000. If you already have a process listening to port 4000, you can change it in the Fabric api config file ``fabric/api/config.json``. Note: some bash scripts will refer directly to the applications running on port 4000 for cleanup, if you change the Fabric SDK port you may have to kill the application by yourself once you're done.

The fabric Network and SDK will start in the background, you can use ``npm run fabric:log`` to show the Fabric nodes outputs and ``cat fabric/logs/start.log`` for the SDK outputs

Alternatively, you can do all of the above manually by following [Fabric documentation](https://hyperledger-fabric.readthedocs.io/en/release-1.4/) using the config from ``fabric/artifacts`` and deploying the contracts from ``fabric/contracts`

#### Fabric Federation

To enable the overlay network of validators we need to build locally the docker image:
``npm run fed:build``

Then, you can run a federation of 4 validators:
``npm run fed:fabric``
Federation validators are relying on Fabric nodes and connectors to perform Blockchain actions and verifications, the default config is set to look for a running instance of the Fabric SDK locally on port 4000. If you are running the Fabric SDK on a different port or another machine you want to modify the ``federations/docker-compose-fabric.yml`` accordingly, look for ``URL: "http://172.20.0.1:4000"`` for each of the services and modify the string to point to the correct endpoint.

The federation will start in the background, you can use ``npm run fed:fabric:log`` to show the Fabric federation validator outputs.

#### Quorum Blockchain

To run the Quorum Blockchain, you can use the following script:
``npm run quorum``

This will run a Quorum network of 7 nodes using Tessera and RAFT. Tessera can take a few minutes to start completely and you will have to wait for it before launching the following commands. To now when Tessera is ready, you can list your docker containers ``docker ps`` and wait for all of them to turn "healthy".

Then, you can build
``npm run quorum:api:build``
and then run the custom quorum API:
``npm run quorum:api``
quorum API will use ports 5050, 5051, 5052 and 5053 by default, you can change it in the Fabric api docker-compose file ``quorum/api/docker-compose.yml``, look for ``APP_PORT: 505`` for each of the services.

The Quorum Network and SDK will start in the background, you can use respectively ``npm run quorum:log`` and ``npm run quorum-api:log`` to show the Quorum nodes and Quorum API outputs.

#### Quorum Federation

The same way than the Fabric federation, to enable the overlay network of validators we need to build locally the docker image:
``npm run fed:build``. If you plan to deploy both federations on the same machine, you don't have to rebuild the image

Then, you can run a federation of 4 validators:
``npm run fed:quorum``
Federation validators are relying on Fabric nodes and connectors to perform Blockchain actions and verifications, the default config is set to look for a running instance of the Fabric SDK locally on port 5050. If you are running the Fabric SDK on a different port or another machine you want to modify the ``federations/docker-compose-fabric.yml`` accordingly, look for ``URL: "http://172.20.0.1:5050"`` for each of the services and modify the string to point to the correct endpoint.

#### Corda Blockchain

First you need to build and deploy a Corda network. For this you need to run the following script:
``npm run corda:build``

This process can take several minutes to load the necessary components and assemble the Corda nodes. After successfully deploying the Corda nodes and web servers, you can run the Corda network.

To run the Corda Blockchain, you can use the following script:
``npm run corda``

This will run a Corda network of 5 nodes and 4 web servers. The launch will take you a couple of minutes.

#### Corda Federation

As mentioned above, you do not need to rebuild the docker image if you have already done it. Otherwise run next script:
``npm run fed:build``

Then, you can run a federation of 4 validators:
``npm run fed:corda``
Federation validators are relying on connectors to trigger Corda flows and verifications.

The federation will start in the background, you can use ``npm run fed:corda:log`` to show the Corda federation validator outputs.

### Scenarios

All scenarios are connected to all three Blockchains and their federations. If you run everything locally with the default port you can go forward and launch one of the scenarios with the following commands. Otherwise, you will have to modify the config file located in the scenarios folder under simple-asset-transfer folder, to match the proper url for each of the networks.

* **share-pub-key** ``npm run scenario:share``

Fetch all Validators' public keys from Corda, Quorum and Fabric Blockchains and share them between participating Blockchains.

- Step 1 Call ``askForPubKey`` for each of the alive Corda validators and gather them
- Step 2 Call ``askForPubKey`` for each of the alive Quorum validators and gather them
- Step 3 Call ``askForPubKey`` for each of the alive Fabric validators and gather them
- Step 4 Call ``addForeignValidator`` to store Corda + Quorum public keys to Fabric smart contract
- Step 5 Call ``addForeignValidator`` to store Corda + Fabric pubic keys into and Quorum smart contract
- Step 6 Call ``addForeignValidator`` to store Fabric + Quorum public keys to Corda ledger

Note: Last steps be fail if the public keys have already been stored. Launching the scripts multiple times will automatically cause this problem

* **fabric-to-quorum** ``npm run scenario:FtQ``
* **quorum-to-fabric** ``npm run scenario:QtF``
* **corda-to-quorum** ``npm run scenario:CtQ``
* **corda-to-fabric** ``npm run scenario:CtF``
* **fabric-to-corda** ``npm run scenario:FtC``
* **quorum-to-corda** ``npm run scenario:QtC``

This list of scenarios that create an asset on one of Blockchains ('export chain') and retire it, then ask a proof of retirement from the validators and send the proof in another Blockchain ('import chain') for on-chain verifications of the signature

- Step 1 Call ``createAsset`` to generate a standard asset with a pseudo-random ID on 'export chain'
- Step 2 Call ``lockAsset`` to retire the asset specifying a target public key (optional) on 'export chain'
- Step 2.5 (optional) Call ``getAsset`` to verify the state of the asset on 'export chain'
- Step 3 Call ``askForSignature`` for the retirement of the asset and gather the signatures of the validators (should be 4 of them)
- Step 4 Call ``verifySignature`` to check the generated proof on 'import chain'
- Step 5 Call ``copyAsset`` to creating a copy of the exported asset on 'import chain'

### Tests

Tests come in two versions: local unit tests and tests calling running Blockchain environments. To run the local unit tests, you can use ``npm run test`` in the simple-asset-transfer folder. To run the extended tests you can use ``npm run test:bc``. Note: alike the scenarios, test:bc connects to both Fabric and Quorum Blockchains. If you run everything locally with the default port you can go forward. Otherwise, you will have to modify the config file located in the tests folder to match the proper url for each of the networks.
