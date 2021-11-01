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
found in the
[network-setups](../../../tests/network-setups)
repo.

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
