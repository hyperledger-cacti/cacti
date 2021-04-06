<!--
 Copyright IBM Corp. All Rights Reserved.

 SPDX-License-Identifier: CC-BY-4.0
 -->
# Corda interoperability application

To build the interoperation CorDapp locally, run the following:

```
make build-local
```

To build the interoperation CorDapp without artifactory dependencies, run the following:

```
make build
```

The two important jars that are created are
`interop-contracts/build/libs/interop-contracts-<version-number>.jar` and
`interop-workflows/build/libs/interop-workflows-<version-number>.jar`.

## Publishing to Artifactory

The interop CorDapp components have gradle tasks to allow publication to
Artifactory. These can be run with:

```
make publish
```

Or they can be run separately with:

```
./gradlew publishWorkflowsPublicationToMavenRepository
./gradlew publishContractsPublicationToMavenRepository
```

The latest version of this CorDapp on Artifactory is:

```
interop-contracts-0.6.jar
interop-workflows-0.6.jar
```

## Updating the version number

To update the version number of the CorDapps that get published to Artifactory,
first change the version number in the `gradle.properties` file, then in each of
the `interop-workflows/build.gradle` and `interop-contracts/build.gradle` change
the version number in the `publishing` gradle task.

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
