<!--
 Copyright IBM Corp. All Rights Reserved.

 SPDX-License-Identifier: CC-BY-4.0
 -->
# corda-driver

The Corda driver is used by the relays to interface with the Corda nodes. It
triggers flows from the interoperation CorDapp to retrieve state given the query
from the external network.

## Setup

To build the driver executable locally (delete `github.properties` if present, else it will try to fetch dependencies from Github Packages), run the following:

_Prerequisites_: Build the following dependencies in sequence:
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

Now build the driver as follows:
```
make build-local
```

To build the driver executable using dependencies from Github Packages, follow the steps:
* Create a Personal Access Token with write, read, and delete packages access in github. Refer [Creating a Personal Access Token](https://docs.github.com/en/github/authenticating-to-github/keeping-your-account-and-data-secure/creating-a-personal-access-token) for help.
* Create a copy of `github.properties.template` as `github.properties`.
* Replace <GITHUB Email> with your email id for github.
* Replace <GITHUB Personal Access Token> with your personal access token.

```
make build
```

If you see compile errors about classes not being found, it may be that gradle
hasn't downloaded the required dependencies. To install the dependencies (with or without Github Packages support), run:

```
make build-refresh-dependencies[-local]
```

## Run

To run the driver, use the following:

```
./build/install/corda-driver/bin/corda-driver
```

The driver gRPC server will be listening on port `9099`.

### With TLS

If the relay expects a TLS connection over gRPC, you need to specify the following environment variables in the `corda-driver` command:
- `RELAY_TLS`: should be set to `true`
- One of the following:
  * If the relay server TLS CA certificates are in a password-protected Java Key Store (JKS file):
    - `RELAY_TLSCA_TRUST_STORE`: JKS file path
    - `RELAY_TLSCA_TRUST_STORE_PASSWORD`: password used to create the JKS file
  * If the relay server TLS CA certificates are in separate PEM files in the filesystem:
    - `RELAY_TLSCA_CERT_PATHS`: colon-separated list of CA certificate file paths
If you wish to run the driver service with TLS enabled, you need to specify the following environment variables in the `corda-driver` command:
- `DRIVER_TLS`: should be set to `true`
- `DRIVER_TLS_CERT_PATH`: driver's TLS certificate file path
- `DRIVER_TLS_KEY_PATH`: driver's TLS private key file path
- Example: both relay and driver are TLS-enabled, and a trust store is used as a certificate repository:
  ```bash
  RELAY_TLS=true RELAY_TLSCA_TRUST_STORE_PASSWORD=password RELAY_TLSCA_TRUST_STORE=trust_store.jks DRIVER_TLS=true DRIVER_TLS_CERT_PATH=cert.pem DRIVER_TLS_KEY_PATH=key.pem ./build/install/corda-driver/bin/corda-driver
  ```
- Example: only relay is TLS-enabled, and the driver's trusted certificates are in separate files in the filesystem:
  ```bash
  RELAY_TLS=true RELAY_TLSCA_CERT_PATHS=ca_cert1.pem:ca_cert2.pem ./build/install/corda-driver/bin/corda-driver
  ```

If the driver is deployed within a Docker container, set the same variables as above in the appropriate `.env` file. The following sample files in [./docker-testnet-envs/](./docker-testnet-envs) can be used and tweaked for Fabric drivers associated with particular testnets:
- Corda `Corda_Network`: `.env.corda` (non-TLS) and `.env.corda.tls` (TLS)
- Corda `Corda_Network2`: `.env.corda2` (non-TLS) and `.env.corda2.tls` (TLS)

## Driver configuration

By default, the driver gRPC server listens on port `9099`. To change the port, set 
the `DRIVER_PORT` as an environment variable. 

Set `DRIVER_RPC_USERNAME` to a rpc user created for driver in the corda network.

Set `DRIVER_RPC_PASSWORD` to the password of above user.

## Docker

To build image, run:
```
make image
```

To push image to github container registry:

* Create a Personal Access Token with write, read, and delete packages access in github. Refer [Creating a Personal Access Token](https://docs.github.com/en/github/authenticating-to-github/keeping-your-account-and-data-secure/creating-a-personal-access-token) for help.
* Run `docker login ghcr.io` and use your github username and personal access token as password.
* Create a copy of `github.properties.template` as `github.properties`.
* Replace <GITHUB Email> with your email id for github.
* Replace <GITHUB Personal Access Token> with your personal access token.
* Run `make push-image` to build and push the image to github registry.

**NOTE:** Push image to `hyperledger-labs` only after PR approval, first test it by deploying it on your fork by running (instead of last step above): `make push-image DOCKER_REGISTRY=ghcr.io/<username>`, where replace `<username>` with your git username.

### Docker-Compose Deployment

* Copy `.env.docker.template` to `.env`
    - `NETWORK_NAME`: Used as suffix to corda-driver container name, i.e. `corda-driver-<network-name>` will be the name of the container.
    - `DRIVER_PORT`: Driver server port.
    - `DRIVER_RPC_USERNAME`: RPC user registered for Driver.
    - `DRIVER_RPC_PASSWORD`: Password for the above RPC user.
    - `EXTERNAL_NETWORK`: Name of the docker network in which the Corda containers are deployed.
    - `DOCKER_IMAGE_NAME`: _Keep this unchanged_.
    - `DOCKER_TAG`: Refer here for the image tags available: [weaver-corda-driver](https://github.com/hyperledger-labs/weaver-dlt-interoperability/pkgs/container/weaver-corda-driver)
    - `COMPOSE_PROJECT_NAME`: Docker project name for the Corda network to which this driver is supposed to attach. By default, the folder name of the Corda network's `docker-compose.yml`, is the project name.
    - `COMPOSE_PROJECT_NETWORK`: Docker project network name for the Corda network to which this driver is supposed to attach. By default, `default` is the project network name.
    - `RELAY_TLS`: Boolean flag indicating whether or not the local relay requires TLS connections
    - `RELAY_TLSCA_TRUST_STORE`: Path to JKS file (truststore) containing TLS CA certificates
    - `RELAY_TLSCA_TRUST_STORE_PASSWORD`: Password used to create the above JKS file
    - `RELAY_TLSCA_CERT_PATHS`: Colon-separated TLS certificate paths for local relay
    - `DRIVER_TLS`: Boolean flag indicating whether or not the driver requires TLS connections
    - `DRIVER_TLS_CERT_PATH`: Driver's TLS certificate path
    - `DRIVER_TLS_KEY_PATH`: Driver's TLS private key path
* Create a Personal Access Token with read packages access in github. Refer [Creating a Personal Access Token](https://docs.github.com/en/github/authenticating-to-github/keeping-your-account-and-data-secure/creating-a-personal-access-token) for help.
* Run `docker login ghcr.io` and use your github username and personal access token as password.
* Run: `make deploy`.
* To stop, run: `docker-compose down`

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
[protos](../../../common/protos). It
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
Github Maven Repository, change the version number of the `interop_cordapps_version` at the
top of the `build.gradle` file. 

## TODO

1. Create an Error class
2. Make a script for pulling the latest interop cordapp (add to make)
