---
id: advanced-configuration
title: Advanced Configuration
---

<!--
 Copyright IBM Corp. All Rights Reserved.

 SPDX-License-Identifier: CC-BY-4.0
 -->

You can configure the different components of the test network to use non-default parameter values for various settings (such as host names or port numbers). Here is a list of configurations you can tweak, classified by the DLT type.

## Corda

### Relay

To run the relay on a different port from the default (`9081`), do the following:
- Navigate to the `core/relay` folder.
- Update the `port` field in `config/Corda_Relay.toml`.
- To ensure that the relay of `network1` can communicate with this relay, update the `port` field in the `relays.Corda_Relay` section in `config/Fabric_Relay.toml` with the same value.
- To ensure that the relay of `network2` can communicate with this relay, update the `port` field in the `relays.Corda_Relay` section in `config/Fabric_Relay2.toml` with the same value.
- (You can update host names in similar locations, by adjusting the `hostname` field.)
- When you attempt a Fabric to Corda interoperation flow, use the new host name or port (instead of `localhost:9081`).

### Driver

To run the driver on a different port from the default (`9099`), do the following:
- Navigate to the `core/drivers/corda-driver` folder.
- Set the environment variable `DRIVER_PORT` appropriately while running the executable as follows:
  ```bash
  DRIVER_PORT=<port> ./build/install/corda-driver/bin/corda-driver
  ```

To ensure that the relay can connect to this driver:
- Navigate to the `core/relay` folder.
- Update the `port` field in the `drivers.Corda` section in `config/Corda_Relay.toml` with the same value.

### Network

| Notes |
|:------|
| In our sample setup, all the Corda nodes must be running on the same machine (`localhost` or some other) for seamless communication. |

To change the ports the Corda nodes are listening on, do the following:
- Navigate to the `tests/network-setups/corda` folder.
- Update the exposed ports in `docker-compose.yml` (defaults are `10003` for the `notary` container and `10006` for the `partya` container).
- Navigate to the `samples/corda/corda-simple-application` folder.
- Update the `CORDA_HOST` (default is `localhost`) and `CORDA_PORT` (default is `10006`) environment variables on your host machine to reflect the above update, or run the client bootstrapping script as follows:
  ```bash
  CORDA_HOST=<hostname> CORDA_PORT=<port> make initialise-vault
  ```
- When you attempt a Fabric to Corda interoperation flow, use the new host name and port values as in the following example (`network1` requesting `Corda_Network`):
  ```bash
  ./bin/fabric-cli interop --local-network=network1 --requesting-org=org1.network1.com localhost:9081/Corda_Network/<CORDA_HOST>:<CORDA_PORT>#com.cordaSimpleApplication.flow.GetStateByKey:H`
  ```

### Client Application

The config files used to initialise the network's verification policies, access control policies, and security group info, contain the address (host name and port) of the Corda node.
To update the address of the Corda node, do the following:
- Navigate to the `samples/corda/corda-simple-application` folder.
- Edit the `rules --> resource` field in line 7 in `clients/src/main/resources/config/FabricNetworkAccessControlPolicy.json` by replacing `localhost:10006` with `<CORDA_HOST>:<CORDA_PORT>` as specified in the previous section.

## Fabric

### Relay

To run the relay on a different port from the default (`9080` for `network1` and `9083` for `network2`), do the following:
- Navigate to the `core/relay` folder.
- Update the `port` field in `config/Fabric_Relay.toml` (for `network1`) or `config/Fabric_Relay2.toml` (for `network2`).
- To ensure Fabric-Fabric relay communication, update the foreign relay port in the `port` field in the `relays.Fabric_Relay` section in either of the above files.
- To ensure that the Corda network's relay can communicate with this relay, update the `port` field in the `relays.Fabric_Relay` section in `config/Corda_Relay.toml`.
- (You can update host names in similar locations, by adjusting the `hostname` field.)
- When you attempt a Fabric to Fabric or Corda to Fabric interoperation flow, use the new host name or port (instead of `localhost:9081` or `localhost:9083`).
- Navigate to the `core/drivers/fabric-driver` folder.
- Update the `RELAY_ENDPOINT` variable in `.env` or specify `RELAY_ENDPOINT=<hostname>:<port>` in the command line while running the driver using `npm run dev`.
- Navigate to the `samples/fabric/fabric-cli` folder.
- Update the `relayEndpoint` variables appropriately.

### Driver

The `fabric-driver` configuration can be controlled by environment variables either set in `.env` in the `core/drivers/fabric-driver` folder (or a copy if you created one) or passed in the command line when you run `npm run dev` to start the driver. The relevant variables you can control when you make any change to the setup are:
- `CONNECTION_PROFILE`: this is the path to the connection profile. If you make changes to the network or use a different one, create a new connection profile and point to it using this variable.
- `RELAY_ENDPOINT`: this is the endpoint of the relay (hostname and port), and you can adjust it as described in the previous section; this is where the relay will be listening for incoming requests and from where the relay will channel foreign requests as well.
- `DRIVER_ENDPOINT`: this is the hostname and port the driver itself will bind to, and you can change it from the default (`localhost:9090` for `network1` and `localhost:9095` for `network2`) as per your need

### Fabric CLI

You can adjust settings for `fabric-cli` in the `.env` and `config.json` (in the `samples/fabric/fabric-cli` folder) as described earlier.

Important environment variables (in `.env`) are:
- `DEFAULT_CHANNEL`: this is the name of the channel the CLI will interact with. If you build a new channel or network, update the channel name here.
- `DEFAULT_CHAINCODE`: this is the name of the interoperaton chaincode the CLI will submit transactions and queries to for policy and security group bootstrapping. If you wish to test with a modified interoperation chaincode with a different name, update this value.
- `MEMBER_CREDENTIAL_FOLDER`: as described earlier, this is an absolute path that points to policies and security group info associated with foreign networks. You can adjust this info for the existing three networks or add credentials for another network you wish to test interoperation flows with.
- `LOCAL`: this is a boolean, indicating whether the network to connect to is running on (and as) `localhost`
- `DEFAULT_APPLICATION_CHAINCODE`: this is the name of the application chaincode which maintains information that can be shared (with proof) with other networks upon request using interoperation. You may write and deploy your own chaincode and use its name here instead of the default `simplestate`.
- `CONFIG_PATH`: this points to the JSON file containing the configurations of all the Fabric networks that need to be configured using the `fabric-cli`.

The `config.json` (which can have a different name as long as you add the right reference to `.env` and configure `fabric-cli` suitably) has the following structure (it can have any number of networks specified):

```
{
  "network1": {
    "connProfilePath": "",
    "relayEndpoint": ""
  },
  "network2": {
    "connProfilePath": "",
    "relayEndpoint": ""
  }
}

```
- `connProfilePath`: absolute path of the network's connection profile
- `relayEndpoint`: hostname and port of the particular network's relay (make sure you sync this with any changes made to that relay's configuration)

