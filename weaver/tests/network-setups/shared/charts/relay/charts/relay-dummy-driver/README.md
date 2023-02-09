<!--
 Copyright IBM Corp. All Rights Reserved.

 SPDX-License-Identifier: CC-BY-4.0
 -->
# Relay Dummy Driver Helm Chart

This Helm chart deploys an instance of Dumy Driver for testing purposes and allows for customising the deployment via the default image built via the relay repository (suggested image is: `dlt-interop/relay-driver`).

## Basic Configuration

The relay can be configured by specifying all of its required settings via the [values.yaml](values.yaml) file. The following aspects can be configured:

- Driver name (i.e. `driver.name`)
- Driver host (i.e. `driver.host`): this will be used to create the associated service name.
- Driver port (i.e. `driver.port`): this will be used to create the associated service port.
- Relay Server name: (i.e. `discovery.relay.name`)
- Realy Server host: (i.e. `discovery.relay.host`): this should be set to the hostname/service name of the relay server.
- Relay Server port: (i.e. `discovery.relay.port`): this should be set to the port of the relay server (use the service port if deploying in K8s cluster)

### Deployment details

The following section of the configuration contains the details of the deployment in the cluster:

```yaml

deployment:
  image: dlt-interop/relay-driver:latest
  imagePullPolicy: Always
  replicas: 1
  namespace: default
```


## Customising the Default Configuration

The driver image allows for configuring more deeply the driver by specifying the confguration files, and template server configuration. These settings are available via the following configuration entries:

- `configuration.path` : for the driver configuration file, for supplying a specific confiuguration.
- `configuration.templatePath` : for specifying a given driver configuration template.

__NOTE__: This chart does not provides any functionality to create and specify the content of these files. These files at present time are expected to be already available via the image used for the deployment of the server.

## Relay Server Discovery

The details of the server where to connect are specified in the discover section:

```yaml
discovery:
  relay:
    name: Relay Server
    host: relay-server
    port: 9080
```

The above shows the default configuration for the dummy relay. The value of the `host` property must be set to the service name exposing the relay server in the K8s cluster, or the full service name if deployed in another namespace.