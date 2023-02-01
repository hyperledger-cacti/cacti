<!--
 Copyright IBM Corp. All Rights Reserved.

 SPDX-License-Identifier: CC-BY-4.0
 -->
# Corda interoperability application

To build the interoperation CorDapp locally, first build the protobufs:
```
cd ../../../common/protos-java-kt
make build
```
Then run the following:
```
make build-local
```

To build the interoperation CorDapp with github dependencies, run the following:

```
make build
```

The two important jars that are created are
`interop-contracts/build/libs/interop-contracts-<version-number>.jar` and
`interop-workflows/build/libs/interop-workflows-<version-number>.jar`.

## Updating the version number

To update the version number of the CorDapps that get published to Github Packages,
first change the version number in the `gradle.properties` file.

## Running tests

Several tests for the `QueryStateWithFlowAndParams` flow have been defined in
`FlowTests.kt`. These can be run with:

```
./gradlew test
```

## Documentation

This repo uses `Dokka` to auto-generate the Kotlin code documentation. To
generate the code docs, run the following:

```
./gradlew dokka
```

The docs are then located in `build/dokka/corda-interop-app`. Opening
`index.html` in your browser will allow you to navigate through the project
structure.

## Updating Version

If updating Interop CorDapp version, update the dependency version for in:
* `sdks/corda/build.gradle`
* `samples/corda/corda-simple-application/constants.properties`
* `samples/corda/fungible-house-token/constants.properties`
* `tests/network-setups/corda/scripts/get-cordapps.sh`
* `tests/network-setups/corda/scripts/start-nodes.sh`

## Steps to publish:

1) Create a Personal Access Token from Github with write/read/delete access to packages. Refer [Creating a Personal Access Token](https://docs.github.com/en/github/authenticating-to-github/keeping-your-account-and-data-secure/creating-a-personal-access-token) for help.
2) Create a copy of `github.properties.template` as `github.properties`.
3) Replace <GITHUB Email> with your email id for github.
3) Replace <GITHUB Personal Access Token> with your personal access token.
4) Run `make publish` to publish package to github packages.

**NOTE:** Always publish to your fork first, and only after testing it well, then 
after PR approval, publish it to `hyperledger-labs/weaver-dlt-interoperability`.
To publish to your fork, replace `<your-git-name>` with your github username in `github.properties`:
```
...
url=https://maven.pkg.github.com/<your-git-name>/weaver-dlt-interoperability
```
and then follow above 4 steps.

**NOTE:** To change version, just modify it in `gradle.properties`.

## Steps to use module published in Github Packages with Gradle:

1) Create a Personal Access Token from Github with read access to packages. Refer [Creating a Personal Access Token](https://docs.github.com/en/github/authenticating-to-github/keeping-your-account-and-data-secure/creating-a-personal-access-token) for help.
2) Create a copy of `github.properties.template` as `github.properties`.
3) Replace <GITHUB Email> with your email id for github.
4) Replace <GITHUB Personal Access Token> with your personal access token.
5) Add this to your build.gradle (change the version accordingly):
```
dependencies {
	compile(group: 'com.weaver.corda.app.interop', name: 'interop-contracts', version: "1.2.1")
	compile(group: 'com.weaver.corda.app.interop', name: 'interop-workflows', version: "1.2.1")
}
```

## TODO

- Tests for the new HandleExternalRequest flow
- Incorporate code documentation with project documentation
- Tests for Verification Policy flows
- Documentation for Verification Policy
- Tests for Access Control Policy flows
- Documentation for Access Control Policy
- Tests for Security Group flows
- Documentation for Security Group Policy
- Investigate why the certificate that the Corda node uses to sign is not the
  same certificate that is in the node keystore. This new certificate is
  self-signed and is not a Sun EC key (there is no provider listed on it). When
  using the `.verify()` method on the certificate it fails in Corda with an
  `java.security.InvalidAlgorithmParameterException: java.lang.UnsupportedOperationException: engineSetParameter unsupported`
  error.
