<!--
 Copyright IBM Corp. All Rights Reserved.

 SPDX-License-Identifier: CC-BY-4.0
 -->
# Relay Server Helm Chart

This Helm chart deploys an instance of a Relay Server and allows for customising the deployment of the relay via the default image built via the relay repository (suggested image is: `dlt-interop/relay-server`).

## Basic Configuration

The relay can be configured by specifying all of its required settings via the [values.yaml](values.yaml) file. The following aspects can be configured:

- Relay server name (i.e. `server.name`)
- Relay server host (i.e. `server.host`): this will be used to create the associated service name.
- Relay server port (i.e. `server.port`): this will be used to create the associated service port.
- Driver name: (i.e. `discovery.driver.name`)
- Driver host: (i.e. `discovery.driver.host`): this should be set to the hostname/service name of the driver.
- Driver port: (i.e. `discovery.driver.port`): this should be set to the port of the driver (use the service port if deploying in K8s cluster)
- Additional configuration for remote relays.

### Deployment details

The following section of the configuration contains the details of the deployment in the cluster:

```yaml

deployment:
  image: dlt-interop/relay-server:latest
  imagePullPolicy: Always
  replicas: 1
  namespace: default
```


## Customising the Default Configuration

The relay image allows for configuring more deeply the relay server by specifying the confguration files,
template server configuration, and root path forn the DNS configuration of the remote relay. These settings are available via the following configuration entries:

- `configuration.path` : for the server configuration file, for supplying a specific confiuguration.
- `configuration.templatePath` : for specifying a given server template.
- `configuration.relaysPath` : for specifying a different root path for the relay entries.

__NOTE__: This chart does not provides any functionality to create and specify the content of these files. These files at present time are expected to be already available via the image used for the deployment of the server. 

## Customising the Relays discovery

This charts allows for specifying the details about the remote relays that this server should know about. This is done by adding entries in the following configuration settings:

```yaml
discovery:
  relays:
    dns:
    - group: fabric
      entries:
      - name: Relay Network 1
        host: relay.network1.dlt-interop.org
        port: 9080
      - name: Relay Network 2
        host: relay.network2.dlt-interop.org
        port: 9081
    - group: corda
      entries:
      .....
```

This configuration creates a config map with two file entries (i.e. `fabric.toml` and `corda.toml`) containing the specification of the relays to be added to the server configuration file. The config map is mounted as a volume to the relay server deployment under the path identified by `configuration.relaysPath` or `/opt/relay/config/relays` if not specified. The startup script will do the rest to inject the relays configuration into the server configuration file.
