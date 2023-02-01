<!--
 Copyright IBM Corp. All Rights Reserved.

 SPDX-License-Identifier: CC-BY-4.0
 -->
# Building and Running Relay Components in Docker

## Components Overview

The relay is made up of four distinct executables, that together provide a full set of tooling for testing and development and running a relay server. These are:

- `server`: representing the binary to run the relay server component.
- `dummy-driver`: representing the binary to run an emulation of a relay driver for testing purposes (i.e. *dummy driver*).
- `client`: representing the binary torun a dummy client that can be used to test a relay server implementation.
- `client-tls`: dummy client designed to work with TLS.

Similarly, four distinct images can be built from this repository:

- `dlt-interop/relay:<tag>`: an all-in-one image that packages all the components identified above, and can be used to run any of the components of the relay (ref: [Dockerfile](Dockerfile)).
- `dlt-interop/relay-server:<tag>`: an optimised and specialised image to only run the relay server component that connects to an external driver (ref: [Dockerfile.server](Dockerfile.server)).
- `dlt-interop/relay-driver:<tag>`: an optimised and specialised image to only run the dummy driver component that connects to an external relay server (ref: [Dockerfile.driver](Dockerfile.driver)).
- `dlt-interop/relay-client:<tag>`: an optimised and specialised image to only run the relay clients, both the simple and tls versions [Dockerfile.client](Dockerfile.client)).

All of the images are built out of the [Busybox Image](https://hub.docker.com/_/busybox), and have a very small footprint (the all-in-one image is less than 80 MB).

The repository contains also a simple Docker Compose File to run a combination of relay and dummy driver to facilitate the development and testing.

## Image Labelling and Metadata

Each of the images are labelled with additional information that provide image consumers with metadata to identity the compoment. These labels include:

- `SOLUTION`: this label is set to string `dlt-interop`.
- `COMPONENT`: this label is set to one of the following based on the image being built: `relay all-in-one`, `relay server`, `relay driver` or `relay client`.
- `COMMIT`: this label is set to the short form of the commit number that generated the build obtained via `$(git log -1 --oneline | cut -d ' ' -f 1)`.
- `BRANCH`: this label is set to the branch from which the image was built obtained via `$(git rev-parse --abbrev-ref HEAD)`.
- `VERSION`: this label is set to the version of the image, which is equivalent to the tag used for the image.
- `PROTOS_VERSION`: this label is set to the version of the Protobuf definitions used to build the stubs for the gRPC components, which is indicative of the version of the supported communication protocol.

The last four labels together with the timestamp of the build can also be found in the file system of the images, under the path `/opt/relay/fingerprint.json`, which has the following structure:

```json
  {
    "version"         :   "1.0",
    "protos_version"  :   "0.5",
    "branch"          :   "master", 
    "commit"          :   "456372c",
    "timestap"        :   "2020-07-23 14:32:01+1000"
  }
```

## Relay Server Image

This image contains the setup for running the __Relay Server__ component. The initialisation procedure of the server is controlled by the script [docker/entrypoint-server.sh](docker/entrypoint-server.sh). which first determines whether there is a supplied default configuration for the relay as specified by the `RELAY_CONFIG` environment variable, and if not it used the configuration template specified by `RELAY_CONFIG_TEMPLATE` to generate an actual configuration from the environment variables supplied to the container.

### Environment Variables

The table below provides an overview of the configuration settings available:

| Environment Variable    | Default Value | Usage |
|:------------------------|:-------------:|:------|
| `RELAY_CONFIG`          | `/opt/relay/config/server.toml` | This variables points to the expected location of the configuration file for the server. If there is no such file, the template file is used to generate it. |
| `RELAY_CONFIG_TEMPLATE` | `/opt/relay/config/server.template.toml` | This variable is used in case, there is no supplied configuration file for the server. It is used to generate the actual configuration. |
| `RELAY_DNS`             | `/opt/relay/config/relays` | This variables points to the path containing the information about remote relays' configurations. The path should point to a directory that contains .toml files. Each of these file is a set of DNS entries that are added to the server configuration file.  This is an optional file and if present it is appended to the server configuration. |
| `RELAY_NAME`            | `Relay`       | This variable is used to specify the name of the relay, in the configuration file template. It has no use if there is a supplied configuration. |
| `RELAY_PORT`            | `9080`        | This variable is used to specify the port the relay server listens on in the configuration file template. It has no use if there is a supplied configuration. |
| `DRIVER_NAME`           | ---           | This variable is used to specify the name of the driver that the relay server is configured with in the configuration file template. It has no use if there is a supplied configuration. | 
| `DRIVER_PORT`           | ---           | This variable is used to specify the port of the driver that the relay server is configured with in the configuration file template. It has no use if there is a supplied configuration. |
| `DRIVER_HOST`           | ---           | This variable is used to specify the host of the driver that the relay server is configured with in the configuration file template. It has no use if there is a supplied configuration. |
| `NETWORK_NAME`          | ---           | This variable is used to specify the name of the network the server is proxying in the configuration file template. It has no use if there is a supplied configuration. |
| `DEBUG`                 | ---           | This variable is used to activate the debug mode for the startup script. The debug mode will provide details about the actual configuration used by the relay server. |

### Advanced Customisation

It is possible to customise the behaviour of the image by mounting a different startup script file in the following location: `/opt/relay/entrypoint-server.sh`, or simply changing the entrypoint of the image. Similarly for supplying customised configuration it is sufficient to mount the following paths:

- `/opt/relay/config/server.toml`: for a customised configuration file to start the relay server with.
- `/opt/relay/config/server.template.toml`: for a customised template to use. This file will only be considered in the absence of a configuration.
- `/opt/relay/config/relays.toml`: for additional configuration of remote relays. The configuration file of the relay server also works as discovery service for the relay server. 

## Relay Driver Image

This image contains the setup for running the __Relay Dummy Driver__ component. The initialisation procedure of the server is controlled by the script [docker/entrypoint-driver.sh](docker/entrypoint-driver.sh). which first determines whether there is a supplied default configuration for the driver as specified by the `DRIVER_CONFIG` environment variable, and if not it used the configuration template specified by `DRIVER_CONFIG_TEMPLATE` to generate an actual configuration from the environment variables supplied to the container.

### Environment Variables

The table below provides an overview of the configuration settings available:

| Environment Variable     | Default Value | Usage |
|:-------------------------|:-------------:|:------|
| `DRIVER_CONFIG`          | `/opt/relay/config/server.toml` | This variables points to the expected location of the configuration file for the driver. If there is no such file, the template file is used to generate it. |
| `DRIVER_CONFIG_TEMPLATE` | `/opt/relay/config/server.template.toml` | This variable is used in case, there is no supplied configuration file for the driver. It is used to generate the actual configuration. |
| `DRIVER_NAME`            | `DummyDriver` | __(NOT USED)__ This variable is used to specify the name of the driver in the configuration file template. It has no use if there is a supplied configuration. |
| `DRIVER_PORT`            | `9081`        | This variable is used to specify the port the relay driver listens on in the configuration file template. It has no use if there is a supplied configuration. |
| `RELAY_NAME`             | `Relay`       | This variable is used to specify the name of the relay server the driver is configured with in the configuration file template. It has no use if there is a supplied configuration. |
| `RELAY_PORT`             | `9080`        | This variable is used to specify the port of the relay server the driver is configured with in the configuration file template. It has no use if there is a supplied configuration. |
| `RELAY_HOST`             | `relay-server`| This variable is used to specify the host of the relay server the driver is configured with in the configuration file template. It has no use if there is a supplied configuration. |
| `NETWORK_NAME`           | `dummy`       | This variable is used to specify the name of the network the driver is proxying in the configuration file template. It has no use if there is a supplied configuration. |
| `DEBUG`                  | ---           | This variable is used to activate the debug mode for the startup script. The debug mode will provide details about the actual configuration used by the relay server. |

### Advanced Customisation

It is possible to customise the behaviour of the image by mounting a different startup script file in the following location: `/opt/relay/entrypoint-server.sh`, or simply changing the entrypoint of the image. Similarly for supplying customised configuration it is sufficient to mount the following paths:

- `/opt/relay/config/server.toml`: for a customised configuration file to start the relay server with.
- `/opt/relay/config/server.template.toml`: for a customised template to use. This file will only be considered in the absence of a configuration.
- `/opt/relay/config/relays.toml`: for additional configuration of remote relays. The configuration file of the relay server also works as discovery service for the relay server.


## Relay Client Image

This image contains the setup for running the __Relay Client__ component both in simple and tls mode. The initialisation of the client is controlled by the script [docker/entrypoint-client.sh](docker/entrypoing-client.sh), which determines which type of client to run according to the environment variables passed to the container. 

### Environment Variables

The table below provides an overview of the configuration serttings available:

| Environment Variable     | Default Value | Usage |
|:-------------------------|:-------------:|:------|
| `ENABLE_TLS`             | ---           | If set to `true` enables the TLS mode for the client. |
| `CLIENT_PORT`            | `9082`        | The port that is used by the client to emulate a remote relay. |
| `RELAY_HOST`             | `relay-server`| The host name of the relay server to contacgt to. |
| `RELAY_PORT`             | `9080`        | The port the relay server is listening to for incoming requests. |

### Advanced Customisation

It is possible to customise the behaviour of the image by mounting a different startup script file in the following location: `/opt/relay/entrypoint-client.sh`, or simply changing the entrypoint of the image. 


## Relay All-In-One Image

This image combines all the settings that are used for the previous images. Please refer to the specific documentation of the image that runs the component of interest for determining how to use this image.

If no docker `command` command is provided, the image runs a relay server. The available commands are:

- `server`: to run the relay server
- `driver`: to run the relay driver
- `client`: to run the relay client

If necessary it is possible to pass parameters to any of the component by adding them to command array. The startup script of the image, (ref: [docker/entrypoint.sh](docker/entrypoint.sh)) validates that the command entered is one of the above and the redirects the execution to the corresponding `entrypoint-<server|driver|client>.sh` script, which behaves as already described.

## Running With Docker Compose

This repository also contains a `docker-compose.yaml` file that is designed to spin up a network with Relay Server and Relay Dummy Driver, configured to talk to each other. For testing, it is possible to add a client container in tto the network, which can then be used interactively to test the relay server. 

To run with Docker Compose please refer to the comments in the [docker-compose.yaml](docker-compose.yaml) file or the documentation above.

First **login** to github container registry:

* Create a Personal Access Token with read packages access in github. Refer [Creating a Personal Access Token](https://docs.github.com/en/github/authenticating-to-github/keeping-your-account-and-data-secure/creating-a-personal-access-token) for help.
* Run `docker login ghcr.io` and use your github username and personal access token as password.

**Some sample steps to deploy relay using docker-compose when Config File is available:**

* Copy `.env.template` file to `.env`.
* Keep following Environment Variables in `.env` and delete/ignore rest:
    * PATH_TO_CONFIG: Path to the relay's config file. e.g. `./config/Fabric_Relay.toml`.
    * RELAY_NAME: It's the `name` parameter in the config file. Same is used for container name.
    * RELAY_PORT: Port for grpc relay server.
    * EXTERNAL_NETWORK: Docker bridge network name.
    * DOCKER_IMAGE_NAME: Keep it same as in template.
    * DOCKER_TAG: Tag of the image in github registry. Check here: [weaver-relay-server](https://github.com/hyperledger-labs/weaver-dlt-interoperability/pkgs/container/weaver-relay-server)
* Tip: If running all relays on same host, make sure to change service name before each relay deployment, to avoid conflict in names.
* Run `make convert-compose-method1`.
* Create docker network named `relay`: `docker network create relay`.
* To deploy relay, run: `docker-compose up relay-server -d` (Given relay-server is the service name in docker-compose).
* Also `make start-server` does the above 2 steps, if service name is not changed.

**Some sample steps to deploy relay using docker-compose when Config is not available:**

* Copy `.env.template.2` file to `.env`.
* Configure the following environment variables in `.env` and delete (or ignore) the rest:
  * `RELAY_NAME`: Name for the relay. Same is used for container name.
  * `RELAY_PORT`: Port for grpc relay server.
  * `DRIVER_NAME`: Driver host name.
  * `DRIVER_PORT`: Port for driver.
  * `DRIVER_HOST`: Hostname/IP for driver.
  * `NETWORK_NAME`: Name of network it will be attached to (should be same as used in relay requests arguments.)
  * `NETWORK_TYPE`: Type of network. e.g. `Fabric` or `Corda`.
  * `PATH_TO_REMOTE_RELAYS_DEFINITIONS`: Should point to a directory which stores one or more `*.toml` files, which contain DNS information regarding remote relays. Examples are as follows:
    * The `relays.toml` in [./docker/remote-relay-dns-config](./docker/remote-relay-dns-config) contains connectivity specs for non-TLS-enabled relays.
    * The `relays.toml` in [./docker/remote-relay-dns-config-tls](./docker/remote-relay-dns-config-tls) contains connectivity specs for TLS-enabled relays.
  * `EXTERNAL_NETWORK`: Docker bridge network name.
  * `DOCKER_IMAGE_NAME`: Keep it same as in template.
  * `DOCKER_TAG`: Tag of the image in github registry. Check here: [weaver-relay-server](https://github.com/hyperledger-labs/weaver-dlt-interoperability/pkgs/container/weaver-relay-server)
  * `RELAY_TLS`: Boolean flag indicating whether or not the relay requires TLS connections
  * `RELAY_TLS_CERT_PATH`: TLS certificate path
  * `RELAY_TLS_KEY_PATH`: TLS private key path
  * `DRIVER_TLS`: Boolean flag indicating whether or not the local driver requires TLS connections
  * `DRIVER_TLSCA_CERT_PATH`: Local driver's TLS CA certificate path
* The following sample files in [./docker/testnet-envs/](./docker/testnet-envs/) can be used and tweaked for relays associated with particular testnets:
  * Fabric `network1`: `.env.n1` (non-TLS) and `.env.n1.tls` (TLS)
  * Fabric `network2`: `.env.n2` (non-TLS) and `.env.n2.tls` (TLS)
  * Corda `Corda_Network`: `.env.corda` (non-TLS) and `.env.corda.tls` (TLS)
  * Corda `Corda_Network2`: `.env.corda2` (non-TLS) and `.env.corda2.tls` (TLS)

* Modify `docker/remote-relay-dns-config/relays.toml` to add remote relays' dns information.
* Run `make convert-compose-method2`.
* Tip: If running all relays on same host, make sure to change service name before each relay deployment, to avoid conflict in names.
* Create docker network named `relay`: `docker network create relay`.
* To deploy relay, run: `docker-compose up relay-server -d` (Given relay-server is the service name in docker-compose).
* Also `make start-server` does the above 2 steps, if service name is not changed.

## Push Relay image to Github container registry

* Create a Personal Access Token with write, read, and delete packages access in github. Refer [Creating a Personal Access Token](https://docs.github.com/en/github/authenticating-to-github/keeping-your-account-and-data-secure/creating-a-personal-access-token) for help.
* Run `docker login ghcr.io` and use your github username and personal access token as password.
* Run `make push-server` to build and push the image to github registry.

**NOTE:** Push image to `hyperledger-labs` only after PR approval, first test it by deploying it on your fork by running (instead of last step above): `make push-image DOCKER_REGISTRY=ghcr.io/<username>`, where replace `<username>` with your git username.




