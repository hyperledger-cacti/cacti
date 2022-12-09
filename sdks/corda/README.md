<!--
 Copyright IBM Corp. All Rights Reserved.

 SPDX-License-Identifier: CC-BY-4.0
 -->
# Corda SDK

The Corda SDK is used by the client application to allow corda app to make
interop calls.

## Setup

### Alternative 1: Build Locally:

Build Weaver dependencies:
```
cd ../../common/protos-java-kt
make build
cd -
cd ../../core/network/corda-interop-app
make build-local
cd -
```

To build the SDK locally (delete `github.properties` if present, else it will try to fetch dependencies from Github Packages), run the following:

```
make build
```

### Alternative 2:  Build with Github Packages

To build the driver executable using dependencies from Github Packages, follow the steps:
* Create a Personal Access Token with write, read, and delete packages access in github. Refer [Creating a Personal Access Token](https://docs.github.com/en/github/authenticating-to-github/keeping-your-account-and-data-secure/creating-a-personal-access-token) for help.
* Create a copy of `github.properties.template` as `github.properties`.
* Replace <GITHUB Email> with your email id for github.
* Replace <GITHUB Personal Access Token> with your personal access token.

```
make build
```

**NOTE:** If you see compile errors about classes not being found, it may be that gradle
hasn't downloaded the required dependencies. To install the dependencies (with or without Github Packages support), run:

```
make build-refresh-dependencies[-local]
```

**FOR DEVS:** Now you can run `make publish` as well to publish it to Github Packages, but never publish directly to `hyperledger-labs`. Always first test it by publishing to your own fork, then create a PR to merge your changes, and then you can publish. To publish to your own fork, change `url` in `github.properties`, and replace `hyperledger-labs` with your github username.

## Usage

To use the SDK, add following in your `build.gradle`:

```
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

**NOTE:** In above, `<github-personal-access-token>`, the access token must have `read:packages` access.

## API

All Following functions (except CredentialsCreator), accepts an instance of `net.corda.core.messaging.CordaRPCOps` as first parameter, to make flow calls to corda nodes.

* `InteroperableHelper`: Static Methods:
    - `interopFlow`: Takes input `remoteRelayEndpoint` and `externalViewAddress`, performs a remote relay(interop) call, and stores externalState, and returns it's linearId.
    - `createFabricViewAddress`: Takes remote relay endpoint, security domain, channel name, chaincode name, cc function name and arg to create a view address that can be consumed by `interopFlow` for making interop call to a fabric network. 
    - `createCordaViewAddress`: Takes remote relay endpoint, security domain, list of string of corda host endpoints, flow name, and flow args to create a view address that can be consumed by `interopFlow` for making interop call to a corda network.
    - `getExternalStateView`: Takes linearId returned by interopFlow, and returns protobuf `ViewDataOuterClass.ViewData` object.
    - `getExternalStatePayloadString`: Takes linearId returned by interopFlow, and returns interop payload string.
    - `getExternalStateSignatories`: Takes linearId returned by interopFlow, and returns list of signatories in proof.
    - `getExternalStateSignature`: Takes linearId returned by interopFlow and signatory Id, and returns it's signature that is part of the proof.
    - `getExternalStateSignatoryCertificate`: Takes linearId returned by interopFlow and signatory Id, and returns it's certificate that can be used to verify the signature.
* `AccessControlPolicyManager`: Static Methods:
    - createAccessControlPolicyState
    - updateAccessControlPolicyState
    - deleteAccessControlPolicyState
    - getAccessControlPolicyState
    - getAccessControlPolicies
* `MembershipManager`: Static Methods:
    - createMembershipState
    - updateMembershipState
    - deleteMembershipState
    - getMembershipState
    - getMemberships
* `VerificationPolicyManager`: Static Methods:
    - createVerificationPolicyState
    - updateVerificationPolicyState
    - deleteVerificationPolicyState
    - getVerificationPolicyState
    - getVerificationPolicies
* `CredentialsCreator`: Class Methods:
    - Constructor Args:
        * **baseNodesPath**: Path to the `build/nodes` of Corda Network directory.
        * **securityDomain**: Security Domain Name for this Corda Network.
        * **nodesList**: List of names of Nodes in this Corda Network.
        * **remoteFlow**: Flow pattern for local flow to be used in access control policy.
        * **locFlow**: Flow pattern for remote flow to be used in verification policy.
    - createAccessControlPolicy
    - createMembership
    - createVerificationPolicy

## Updating Version

If updating Corda SDK version, update the dependency version for Corda SDK in:
* `core/drivers/corda-driver/build.gradle`
* `samples/corda/corda-simple-application/constants.properties`
