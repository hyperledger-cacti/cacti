<!--
 Copyright IBM Corp. All Rights Reserved.

 SPDX-License-Identifier: CC-BY-4.0
 -->
[//]: # "SPDX-License-Identifier: CC-BY-4.0"

# Corda Simple Application

This repository contains a simple CorDapp that creates a `SimpleState` that
contains a key/value pair of strings. Flows are defined to create, update and
delete a `SimpleState`. A CLI client is also included that allows the user to
interact with the Corda nodes and trigger the flows in the simple CorDapp and
the interoperation CorDapp. The Corda network itself is defined in the
[network-setups](../../../tests/network-setups)
repository.

## Initial setup

Copy the `github.properties.template` file to `github.properties` with
your IBM email and Artifactory API key. This is needed because the client CLI
triggers flows from the interoperation CorDapp to store external state in the
Corda vault and therefore the interoperation CorDapp needs to be retrieved as a
dependency from Artifactory. To access the interoperation CorDapp, Artifactory
credentials are required and you will need to have permission to access the
[res-dlt-interop-maven-local](https://na.artifactory.swg-devops.com/artifactory/webapp/#/artifacts/browse/tree/General/res-dlt-interop-maven-local)
repository.

## Building the CLI client and CorDapp locally

_Prerequisites_: Build local dependencies as follows:
```
make build-local-weaver-dependencies
```

Alternatively, you can explicitly build the following dependencies in sequence:
**Protobufs**
```
cd ../../../common/protos-java-kt
make build
```
**Interoperation CorDapp**
```
cd ../../../core/network/corda-interop-app
make build-local
```

Now build the CLI client and CorDapp as follows:
```
make build-local
```

**NOTE:** If `github.properties` file is present, then it will always fetch weaver dependencies from Github. Delete this file to build using local modules.

## Building the CLI client and CorDapp using weaver Dependencies in Github Packages

1) Create a Personal Access Token from Github with read access to packages. Refer [Creating a Personal Access Token](https://docs.github.com/en/github/authenticating-to-github/keeping-your-account-and-data-secure/creating-a-personal-access-token) for help.
2) Create a copy of `github.properties.template` as `github.properties`.
3) Replace <GITHUB Email> with your email id for github.
4) Replace <GITHUB Personal Access Token> with your personal access token.

```
make build
```

## Using the CLI client and CorDapp

To use the CLI client and interact with the CorDapp running on the nodes, you
will need to have the Corda network running. Instructions for doing so can be
found [here](../../../tests/network-setups/corda/README.md).

Use the command line client to manage state in the network:

- Create a `SimpleState`

```
./clients/build/install/clients/bin/clients create-state H 1
```

- Query a `SimpleState` by key

```
./clients/build/install/clients/bin/clients get-state H
```

- Query a `SimpleState` by linearId

```
./clients/build/install/clients/bin/clients get-state-using-linear-id LinearId
```

- Query all `SimpleStates`

```
./clients/build/install/clients/bin/clients get-states
```

- Update a `SimpleState`

```
./clients/build/install/clients/bin/clients update-state H 2
```

- Delete a `SimpleState`

```
./clients/build/install/clients/bin/clients delete-state H
```

- At any stage, get help for the command line application with the `--help`
  flag.

### Interoperation flows

The CLI client can also be used to trigger a request for state from an external
network. To do this, other network components will need to be running, please refer to each of the repositories for
instructions.

To make a request from an external network, run:

```
./clients/build/install/clients/bin/clients request-state localhost:9080 localhost:9081/Dummy_Network/dummyViewAddress
```

To load a verification policy into the vault, run

```
./clients/build/install/clients/bin/clients create-verification-policy
```

To make a request from the Corda network to another Corda network, run:

```
./clients/build/install/clients/bin/clients request-state localhost:9080 localhost:9081/Corda_Network/localhost:10006#com.cordaSimpleApplication.flow.GetStateByKey:H
```

To make a request from a Corda network to a Fabric network, run:

```
./clients/build/install/clients/bin/clients request-state localhost:9081 localhost:9080/network1/mychannel:simplestate:Read:Arcturus
```

#### With TLS

If the relay expects a TLS connection over gRPC, you need to specify the following environment variables in each `request-state` command:
- `RELAY_TLS`: should be set to `true`
- One of the following:
  * If the relay server TLS CA certificates are in a password-protected Java Key Store (JKS file):
    - `RELAY_TLSCA_TRUST_STORE`: JKS file path
    - `RELAY_TLSCA_TRUST_STORE_PASSWORD`: password used to create the JKS file
  * If the relay server TLS CA certificates are in separate PEM files in the filesystem:
    - `RELAY_TLSCA_CERT_PATHS`: colon-separated list of CA certificate file paths
- Examples:
  ```bash
  RELAY_TLS=true RELAY_TLSCA_TRUST_STORE_PASSWORD=password RELAY_TLSCA_TRUST_STORE=trust_store.jks ./clients/build/install/clients/bin/clients request-state localhost:9081 localhost:9080/network1/mychannel:simplestate:Read:a
  RELAY_TLS=true RELAY_TLSCA_CERT_PATHS=ca_cert1.pem:ca_cert2.pem ./clients/build/install/clients/bin/clients request-state localhost:9081 localhost:9080/network1/mychannel:simplestate:Read:a
  ```

## HTLC Flows:

* Initialise fungible assets:
```
./scripts/initAsset.sh
```

* Get asset status in corda:
```
./scripts/getAssetStatus.sh 
```

* Generate Secret-Hash Pair using following command (prints hash in base64):
```
./clients/build/install/clients/bin/clients utils hash --hash_fn=SHA256 -s secrettext
```

NOTE: Hash function can be modified by passing argument `--hash-fn=<SHA256|SHA512>` (only SHA256, SHA512 supported currently.) in following lock and claim commands.

* Lock 50 tokens of type t1 in corda by PartyB for PartyA:
```
CORDA_PORT=10009 ./clients/build/install/clients/bin/clients lock-asset --fungible --hashBase64=<hash-in-base64> --timeout=1800 --recipient="O=PartyA,L=London,C=GB" --param=<token-type>:<token-amount>
```

* Claim of 50 t1 tokens in corda by PartyA:
```
CORDA_PORT=10006 ./clients/build/install/clients/bin/clients claim-asset --contract-id=<contract-id> --secret=<hash-preimage>
```

* Unlock after timeout in Corda by PartyB:
```
CORDA_PORT=10009 ./clients/build/install/clients/bin/clients unlock-asset --contract-id=<contract-id>
```

* Query in Corda using PartyA:
```
CORDA_PORT=10006 ./clients/build/install/clients/bin/clients is-asset-locked --contract-id=<contract-id>
```

```
CORDA_PORT=10006 ./clients/build/install/clients/bin/clients get-lock-state --contract-id=<contract-id>
```

**Note:** You can also use `CORDA_PORT=10009` i.e. using PartyB to run above query commands.

## House Token Flows:

To use the CLI client and interact with the CorDapp running on the nodes, you
will need to have the Corda network running. Instructions for doing so can be
found [here](../../../tests/network-setups/corda/README.md#running-fungible-house-token-with-make).

```
Usage: clients house-token COMMAND

Commands:                                                                    
  init            Creates Fungible House Token Type in network
  issue           Issues tokens to a party
  get-balance     Get balance of house tokens
  redeem          Redeem house tokens
  move            Move house tokens
  lock            Locks an asset. lock --fungible --hashBase64=hashbase64
                  --timeout=10 --recipient='PartyA' --param=type:amount
  claim           Claim a locked asset. Only Recipient's call will work.
  unlock          Unlocks a locked asset after timeout.
  is-locked       Query lock status of an asset, given contractId.
  get-lock-state  Fetch HTLC State associated with contractId.    
```

* Initialise house tokens:
```
./scripts/initHouseToken.sh
```

* Get token status in corda:
```
./scripts/getHouseTokenStatus.sh 
```

* Generate Secret-Hash Pair using following command (prints hash in base64):
```
./clients/build/install/clients/bin/clients utils hash --hash_fn=SHA256 -s secrettext
```

NOTE: Hash function can be modified by passing argument `--hash-fn=<SHA256|SHA512>` (only SHA256, SHA512 supported currently.) in following lock and claim commands.

* Lock 10 tokens of type house in corda by PartyB for PartyA:
```
CORDA_PORT=10009 ./clients/build/install/clients/bin/clients house-token lock --fungible --hashBase64=<hash-in-base64> --timeout=1800 --recipient="O=PartyA,L=London,C=GB" --param=house:10
```

* Claim of 10 house tokens in corda by PartyA:
```
CORDA_PORT=10006 ./clients/build/install/clients/bin/clients house-token claim --contract-id=<contract-id> --secret=<hash-preimage>
```

* Unlock after timeout in Corda by PartyB:
```
CORDA_PORT=10009 ./clients/build/install/clients/bin/clients house-token unlock --contract-id=<contract-id>
```

* Query in Corda using PartyA:
```
CORDA_PORT=10006 ./clients/build/install/clients/bin/clients house-token is-locked --contract-id=<contract-id>
```

```
CORDA_PORT=10006 ./clients/build/install/clients/bin/clients house-token get-lock-state --contract-id=<contract-id>
```

**Note:** You can also use `CORDA_PORT=10009` i.e. PartyB, to run above query commands.

## Development tips

_Note_: Optionally add the `-local` suffix to various build commands as indicated below if you wish to avoid depending on Artifactory.

To rebuild the CorDapp without recompiling the client, use the following:

```
make build-cordapp[-local]
```

To rebuild the client without rebuilding the CorDapp, run

```
make clean[-local]
make build-cli[-local]
```

## Documentation

This repo uses `Dokka` to auto-generate the Kotlin code documentation. To
generate the code docs, run the following:

```
./gradlew dokka
```

The docs are located in `build/dokka/corda-simple-application`. Opening
`index.html` in your browser will allow you to navigate through the project
structure.

## Publication to Artifactory

The CorDapp and client have a gradle task to allow publication to Artifactory.
These can be run separately with:

```
./gradlew publishWorkflowsPublicationToMavenRepository
./gradlew publishContractsPublicationToMavenRepository
./gradlew publishClientPublicationToMavenRepository
```

or all together with:

```
make publish
```

Note that the client artifact is quite a large application so avoid publishing
this when possible.

## Updating versions of CorDapps

### Updating versions published to Artifactory
To update the version of the simple application CorDapps and client that are
published to Artifactory, first change the version number in the
`gradle.properties` file. Then in each of the
`clients/build.gradle`, `workflows-kotlin/build.gradle` and
`contracts-kotlin/build.gradle` files, change the version number in the
`publishing` gradle task.

### Updating the version of the interop CorDapps downloaded from Artifactory

At the top of the `clients/build.gradle` file, change the
`interop_cordapps_version` to reflect the required version that is published on
Artifactory.

## Notes on the proto dependencies

This repo relies on data structures defined in
[protos](../../../common/protos). It
also has a dependency on the [interop
CorDapp](../../../core/network/corda-interop-app), which
itself has a dependency on the same proto files. Generating the java and kotlin
files from the proto files locally in this repository therefore creates some
problems. Firstly, because the generated java and kotlin files are created under
the namespace provided in the proto files (e.g. `common.state`), this creates
two sets of the same source files in the classpath under the same namespace.
Compiling the project then fails with a conflicting dependencies error message.
The other problem is that if the proto files do change, they need to be updated
in two separate repositories.

A workaround (or arguably, a cleaner solution) is for the
corda-simple-application project to use the generated java and kotlin source
files that comes from the interop CorDapp. This means that there is one
consistent version of the files, and we don't need to worry about conflicting
dependencies. When the proto files are updated, they need to be updated in a
single repo, instead of across multiple.

## Asset Transfer
### Transfer or recover token (Corda fungible house-token) assets

Assume that the `ledger initialization` of Corda networks was already carried out (refer to [Initialing the Corda Networks](https://github.com/hyperledger-labs/weaver-dlt-interoperability/blob/main/docs/docs/external/getting-started/test-network/ledger-initialization.md#initializing-the-corda-networks-2)).
- Update value for `flowPackage` as `net.corda.samples.tokenizedhouse.flows` for the networks `Corda_Network` and `Corda_Network2` (as the CorDapp `fungible-house-token` was deployed instead of `cordaSimpleApplication` on the networks).
  * This update is required even if relays and drivers are deployed in the host machine.
- The `save-cert` command during ledger initialization fetches the certificate of the parties in base64 format and stores in the folder `clients/src/main/resources/config/credentials/remoteNetworkUsers` with filename `Corda_Network_UsersAndCerts.json` and `Corda_Network2_UsersAndCerts.json` corresponding to `Corda_Network` and `Corda_Network2` respectively. These files are referred during pledge to fetch the certificate of the recipient of the transferred asset, and during claim to fetch the certificate of the pledger of the asset. *This is because, asset transfer doesn't require both the parties being members of neither in the export nor in the import network. It's just sufficient that pledger is part of the asset export network and claimer is part of the asset import network*.
- The `network-id create-state` command during ledger initialization creates a `network-id` for each Corda network. This is a network state, and will be available in the vault of all the parties which are members of the network (if required, run the command `./clients/build/install/clients/bin/clients util get-party-name` with `CORDA_PORT=10006` or `CORDA_PORT=10009` or `CORDA_PORT=30006` or `CORDA_PORT=30009` to fetch the name of the parties `PartyA` in `Corda_Network` or `PartyB` in `Corda_Network` or `PartyA` in `Corda_Network2` or `PartyB` in `Corda_Network2` respectively).
  * The above assumes that both the `Corda_Network` and `Corda_Network2` were started earlier with `2-nodes` (network state created in `Corda_Network` and `Corda_Network2` can be cross checked by running the commands `CORDA_PORT=10006 ./clients/build/install/clients/bin/clients network-id retrieve-state-and-ref` and `CORDA_PORT=30006 ./clients/build/install/clients/bin/clients network-id retrieve-state-and-ref` respectively in these networks).

Assuming that the CorDapp `fungible-house-token` has been deployed in two Corda networks `Corda_Network` and `Corda_Network2`, below are the steps to transfer tokens owned by `PartyA` (`CORDA_PORT=10006`) in `Corda_Network` to `PartyA` (`CORDA_PORT=30006`) in the other network `Corda_Network2`.
- Navigate to `samples/corda/corda-simple-application` folder.
- Initialize Corda fungible house tokens in `Corda_Network` and `Corda_Network2`:
  ```bash
  NETWORK_NAME='Corda_Network' CORDA_PORT=10006 ./clients/build/install/clients/bin/clients house-token init
  NETWORK_NAME='Corda_Network2' CORDA_PORT=30006 ./clients/build/install/clients/bin/clients house-token init
  ```
- Issue `100` house-tokens to `PartyA` in `Corda_Network`:
  ```bash
  NETWORK_NAME='Corda_Network' CORDA_PORT=10006 ./clients/build/install/clients/bin/clients house-token issue -p "O=PartyA, L=London, C=GB" -a 100
  ```
  (check token balance for `PartyA` by running the command `NETWORK_NAME='Corda_Network'  CORDA_PORT=10006 ./clients/build/install/clients/bin/clients house-token get-balance`)
- Let `PartyA` pledge these tokens in `Corda_Network` to be transferred to `PartyA` of `Corda_Network2` (pledge burns the tokens in the source/exporting network):
  ```bash
  NETWORK_NAME='Corda_Network' CORDA_PORT=10006 ./clients/build/install/clients/bin/clients house-token transfer pledge-asset --fungible --timeout="3600" --import-network-id='Corda_Network2' --recipient='O=PartyA, L=London, C=GB' --param='house:5'
  ```
  Note the `pledge-id` displayed after successful execution of the command, which will be used in next steps. Let's denote it `<pledge-id>` which is a hexadecimal string (pledge details can be cross checked using the commands `NETWORK_NAME='Corda_Network' CORDA_PORT=10006 ./clients/build/install/clients/bin/clients house-token transfer is-asset-pledged -pid <pledge-id>` and `NETWORK_NAME='Corda_Network' CORDA_PORT=10006 ./clients/build/install/clients/bin/clients house-token transfer get-pledge-state -pid <pledge-id>`; moreover, check the token balance for `PartyA` in `Corda_Network` by running the command `NETWORK_NAME='Corda_Network' CORDA_PORT=10006 ./clients/build/install/clients/bin/clients house-token get-balance` which should output 95 house tokens).
- Let `PartyA` claim in `Corda_Network2` the tokens which are pledged in the Corda network `Corda_Network` by replacing `<pledge-id>` with the above hexadecimal value (claim issues the tokens in the destination/importing network):
  ```bash
  NETWORK_NAME='Corda_Network2' CORDA_PORT=30006 ./clients/build/install/clients/bin/clients house-token transfer claim-remote-asset --pledge-id='<pledge-id>' --locker='O=PartyA, L=London, C=GB' --transfer-category='house-token.corda' --export-network-id='Corda_Network' --param='house:5' --import-relay-address='localhost:9082'
  ```
  (check the token balance for `PartyA` in `Corda_Network2` by running the command `NETWORK_NAME='Corda_Network2' CORDA_PORT=30006 ./clients/build/install/clients/bin/clients house-token get-balance` which should output `5` house tokens)

The above steps complete a successful asset transfer from the Corda network `Corda_Network` to the Corda network `Corda_Network2`. In addition to the above commands, following is an extra option.

- Let `PartyA` in `Corda_Network` try re-claim the token `house:5` asset, which will succeed only if the house-token asset was not claimed by `PartyA` in `Corda_Network2` and the pledge has expired:
  ```bash
  NETWORK_NAME=Corda_Network CORDA_PORT=10006 ./clients/build/install/clients/bin/clients house-token transfer reclaim-pledged-asset --pledge-id='<pledge-id>' --export-relay-address='localhost:9081' --transfer-category='house-token.corda' --import-network-id='Corda_Network2' --param='house:5'
  ```

## TODO

- Remove the `deployNodes` gradle task as the Corda network config is now done
  in
  [network-setups](../../../tests/network-setups).
- Write tests for the CorDapp and CLI client.
- Fix bug where if Corda flow throws an exception the rpc connection doesn't get
  closed.
- Make local config file for network verification policies so policy to load can
  be looked up based on provided networkId.
- Create commands for updating and deleting a verification policy.
