<!--
 Copyright IBM Corp. All Rights Reserved.

 SPDX-License-Identifier: CC-BY-4.0
 -->
# corda-driver

The Corda driver is used by the relays to interface with the Corda nodes. It
triggers flows from the interoperation CorDapp to retrieve state given the query
from the external network. The interoperation CorDapp is retrieved as a
dependency from Artifactory. To access the interoperation CorDapp, Artifactory
credentials are required and you will need to have permission to access the
[res-dlt-interop-maven-local](https://na.artifactory.swg-devops.com/artifactory/webapp/#/artifacts/browse/tree/General/res-dlt-interop-maven-local)
repository. Copy the `artifactory.properties.template` file to
`artifactory.properties` with your IBM email and Artifactory API key to be able
to download this dependency.

## Setup

To build the driver executable locally, run the following:

```
make build-local
```

To build the driver executable using dependencies in Artifactory, run the following:

```
make build
```

If you see compile errors about classes not being found, it may be that gradle
hasn't downloaded the required dependencies. To install the dependencies (with or without Artifactory support), run:

```
make build-refresh-dependencies[-local]
```

## Run

To run the driver, use the following:

```
./build/install/corda-driver/bin/corda-driver
```

The driver gRPC server will be listening on port `9099`.

## Changing the default port configuration

By default, the driver gRPC server listens on port `9099`. To change the port, set 
the `DRIVER_PORT` as an environment variable. 

## Documentation

This repo uses `Dokka` to auto-generate the Kotlin code documentation. To
generate the code docs, run the following:

```
./gradlew dokka
```

The docs are then located in `build/dokka/corda-driver`. Opening
`index.html` in your browser will allow you to navigate through the project
structure.

## Notes on the proto dependencies

This repo relies on data structures defined in
[interop-protos](../../../common/interop-protos). It
also has a dependency on the [interop
CorDapp](../../../core/network/corda-interop-app), which
itself has a dependency on the same proto files. Generating the java and Kotlin
files from the proto files locally in this repository therefore creates some
problems. Firstly, because the generated java and kotlin files are created under
the namespace provided in the proto files (e.g. `common.state`), this creates
two sets of the same source files in the classpath under the same namespace.
Compiling the project then fails with conflicting dependencies. The other
problem is that if the proto files do change, they need to be updated in two
separate repositories.

A workaround (or arguably, a cleaner solution) is for the corda-testnet project
to use the generated java and kotlin source files that comes from the interop
CorDapp. This means that there is guaranteed to be one consistent version of the
files and we don't need to worry about conflicting dependencies. When the proto
files are updated, they need to be updated in a single repo, instead of across
multiple.

To update the version number of the interop CorDapps that should be pulled from
Artifactory, change the version number of the `interop_cordapps_version` at the
top of the `build.gradle` file. 

## TODO

1. Create an Error class
2. Make a script for pulling the latest interop cordapp (add to make)
