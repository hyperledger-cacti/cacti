<!--
 Copyright IBM Corp. All Rights Reserved.

 SPDX-License-Identifier: CC-BY-4.0
 -->
# Creating Relay Config file

Samples are present in [config](./config) directory. \
Define environment variable `RELAY_CONFIG`, which stores path to the relay config file.

## Parameters Overview

* **name**: Name of the relay. e.g. `Fabric_Relay`
* **port**: Port number for relay grpc server. e.g. `9080`
* **host**: Host address for grpc server. e.g. `0.0.0.0`
* **db_path** and **remote_db_path**: Not required to change, can (optionally) use Relay name in the path, to uniquely identify path per relay. e.g. `db/<relay-name>/requests` and `db/<relay-name>/remote_request` respectively.

* **TLS**: (Optional) To enable TLS, add:
    ```
    cert_path="<tls_cert_path>"
    key_path="<tls_private_key>"
    tls=true
    ```

* **[networks]**: Define list of networks to which this relay will be attached. \
    Format:
    ```
    [networks]
    [networks.<network-name>]
    network=<driver-name>
    ```
    `<network-name>`: Should match the network name used in relay call and view addresses. It will be used in fabric application when making relay requests. \
    `<driver-name>`: Should match with the driver name to be used in **[drivers]** parameter (See below). \
    e.g.:
    ```
    [networks]
    [networks.network1]
    network="Fabric"
    [networks.Corda_Network]
    network="Corda"
    ```
    **NOTE**: Most normal deployments have a 1-1 relay-network correspondence, but we also support a 1-many if multiple networks are willing to share a relay. The above config covers the latter case. In most cases, the config file would only contain one network entry.
* **[relays]**: Define list of all remote relays to which this relay can/should communicate with. \
    Format: 
    ```
    [relays]
    [relays.<relay-name>]
    hostname="<relay-hostname>"
    port="<relay-port>"
    tls=<true|false>
    tlsca_cert_path="<relay-tls-ca-certificate-path>"
    ```
    `<relay-name>`: Should match with the `name` parameter in remote/other relay's config. \
    `<relay-hostname>`: Hostname/IP for the remote relay. \
    `<relay-port>`: Port for the remote relay. \
    `<relay-tls-ca-certificate-path>`: Path to TLS CA certificate for the <relay-name> relay if it has TLS enabled (i.e., `tls` is set to `true`). \
    e.g.:
    ```
    [relays]
    [relays.Corda_Relay]
    hostname="localhost"
    port="9081"
    tls=true
    tlsca_cert_path="credentials/fabric_ca_cert.pem"
    [relays.Fabric_Relay2]
    hostname="localhost"
    port="9083"
    tls=false
    tlsca_cert_path=""
    ```
* **[drivers]**: Define list of drivers that this relay has ability to invoke/communicate with. \
    Format: 
    ```
    [drivers]
    [drivers.<driver-name>]
    hostname="<driver-hostname>"
    port="<driver-port>"
    tls=<true|false>
    tlsca_cert_path="<driver-tls-ca-certificate-path>"
    ```
    `<driver-name>`: Should match with the one of the driver names used in **[networks]** list. \
    `<driver-hostname>`: Hostname/IP for the driver. \
    `<driver-port>`: Port for the driver. \
    `<driver-tls-ca-certificate-path>`: Path to TLS CA certificate for the <driver-name> driver if it has TLS enabled (i.e., `tls` is set to `true`). \
    e.g.:
    ```
    [drivers]
    [drivers.Fabric]
    hostname="localhost"
    port="9090"
    tls=true
    tlsca_cert_path="credentials/fabric_ca_cert.pem"
    [drivers.Corda]
    hostname="localhost"
    port="9099"
    tls=false
    tlsca_cert_path=""
    ```
    **Note**: `<driver-name>` has nothing to do with anything related to driver's configuration. It is solely used in relay only. This parameter will also mostly contain one network's driver only, but more than one is supported.
    
