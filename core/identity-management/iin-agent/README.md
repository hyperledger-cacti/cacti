<!--
 Copyright IBM Corp. All Rights Reserved.

 SPDX-License-Identifier: CC-BY-4.0
 -->
# IIN Agent Implementation

In this folder lies an implementation of the IIN agent according to the [RFC specification](https://github.com/hyperledger-labs/weaver-dlt-interoperability/blob/main/rfcs/models/identity/iin-agent.md).

The core part of this module is built in a DLT-neutral manner and can be used by a participant of a network running on any DLT platform. The module also has extensions that can be activated for specific DLT platforms.

The agent is presently implemented using TypeScript, though there is no limitation that prevents it from being ported to a different programming language.

## Build the IIN Agent

To build using code purely from this clone of Weaver, do the following:
- If the JavaScript protobufs have not alredy been built, run the following:
  ```bash
  cd ../../../common/protos-js
  make build
  cd ../../core/identity-management/iin-agent
  ```
- Built the agent as follows:
  ```bash
  make build-local
  ```

To build using existing Weaver Github packages, run the the following:
```bash
make build
```

## Configuration

### Security Domain Config

Sample `security-domain-config.json` ([template file here](./security-domain-config.json.template)):
```
{
    "<securityDomainName>": "<ledgerId>",
    "<securityDomainName>": [
        "<node1/org1>",
        "<node2/org2>"
    ]
}
```

It is JSON, with specifying who are the members of a security domain, with keys being the security domain.
* For Fabric, value will be the channel name.
* For Corda, value will be an array of nodes' endpoints. (Not implemented yet)

### DNS Config

Discovery is not implemented yet, so DNS details are added during bootstrapping. A sample `dnsconfig.json` ([template file here](./dnsconfig.json.template)) looks like this:
```
{
    "<securityDomainName>": {
        "<iin-agent1-name>": {
            "endpoint": "<hostname:port>",
            "tls": <true/false>,
            "tlsCACertPath": "<cacert-path-or-empty-string>"
        },
        "<iin-agent2-name>": {
            "endpoint": "<hostname:port>",
            "tls": <true/false>,
            "tlsCACertPath": "<cacert-path-or-empty-string>"
        }
    }
}
```
For each security domain, there's a JSON object which contains elements with key as iin-agent's name, which can be Org MSP Id for Fabric, or Node Id for Corda, and value as another JSON object. This value contains `endpoint` for the iin-agent, boolean `tls` which is true if TLS is enabled for that iin-agent, and `tlsCACertPath` which specifies the path to file containing TLS CA certs, keep it empty string if not known.

### Environment Variables

Following are the list of environment variables for IIN Agent:

* `IIN_AGENT_ENDPOINT`: The endpoint at which IIN Agent server should listen. E.g.: `0.0.0.0:9500`
* `IIN_AGENT_TLS`: Set this to `true` to enable TLS on IIN Agent server
* `IIN_AGENT_TLS_CERT_PATH`: Path to TLS certificate if TLS is enabled
* `IIN_AGENT_TLS_KEY_PATH`: Path to TLS key if TLS is enabled
* `MEMBER_ID`: Member Id for this IIN Agent. For fabric network, it should be the Organization's MSP ID
* `SECURITY_DOMAIN`: Security domain to which this IIN Agent belongs
* `DLT_TYPE`: To indicate the type of DLT for which this IIN Agent is running. E.g. `fabric`
* `CONFIG_PATH`: Path to ledger specific config file (explained in next subsection)
* `DNS_CONFIG_PATH`: Path to DNS config file explained in previous sub sections
* `SECURITY_DOMAIN_CONFIG_PATH`: Path to security domain config file explained in previous sub sections
* `WEAVER_CONTRACT_ID`: Contract ID for DLT specific weaver interoperation module installed on network
* `SYNC_PERIOD`: Period at which auto synchronization of memberships from other security domains should happen
* `AUTO_SYNC`: Set this to `true` to enable auto synchronization of memberships from other security domains

These can be specified in the `.env`, whose template file is [.env.template](./.env.template). Alternatively these can be specified from command line as well.

### Ledger Specific Configurations:

#### Fabric

Sample `config.json` for fabric network ([template file here](./src/fabric-ledger/config.json.template)):
```
{
    "admin":{
        "name":"admin",
        "secret":"adminpw"
    },
    "agent": {
        "name":"iin-agent",
        "affiliation":"org1.department1",
        "role": "client",
        "attrs": [{ "name": "iin-agent", "value": "true", "ecert": true }]
    },
    "mspId":"Org1MSP",
    "ordererMspIds": ["OrdererMSP"],
    "ccpPath": "<path-to-connection-profile>",
    "walletPath": "",
    "caUrl": "",
    "local": "true"
}
```

* `admin`: Details of Org CA admin to register IIN Agent user:
  * `name`: Name of Org CA admin
  * `secret`: Secret of Org CA admin
* `agent`: Details of IIN Agent user:
  * `name`: Name of IIN Agent user
  * `affiliation`: Affiliation for this user
  * `role`: Role of IIN Agent user
  * `attrs`: Attributes of IIN Agent user. Note: Don't change existing attribute
* `mspId`: Org MSP ID to which this IIN Agent belongs
* `ordererMspIds`: List of orderer MSP IDs on this network
* `ccpPath`: Path to connection profile of the org whose MSP ID is set in `mspId` field
* `walletPath`: Path to wallet directory. Default: `./wallet-<security-domain>-<member-id>`
* `caUrl`: Url for Fabric CA of this org, if not present in connection profile, else leave it empty
* `local`: Set this to `false` if iin-agent is deployed in a container

## Running the IIN Agent

Run `npm run dev` to start the agent in your terminal. (_Note_: we will support a containerized IIN agent in the future.)

---