# `@hyperledger/cactus-plugin-ledger-connector-aries`

This plugin provides `Cacti` a way to interact with Aries agents and other aries connectors. Using this we can:

- Connect with another Aries agents.
- Request proof from peer.
- Monitor connection and proof state changes.

Limitations:

- AnonCreds V2 protocols only.
- Indy VDR only.
- Only sqlite Askar wallet on the same machine as the connector.

## Summary
- [Getting Started](#getting-started)
- [Usage](#usage)
- [AriesApiClient](#ariesapiclient)
- [Runing the tests](#running-the-tests)
- [Contributing](#contributing)
- [License](#license)
- [Acknowledgments](#acknowledgments)

## Getting Started

Clone the git repository on your local machine. Follow these instructions that will get you a copy of the project up and running on
your local machine for development and testing purposes.

### Prerequisites

In the root of the project to install the dependencies execute the command:

```sh
npm run configure
```

## Usage

To use this plugin, import public-api, create new **PluginLedgerConnectorAries** and initialize it.

```typescript
const connector = new PluginLedgerConnectorAries({
  instanceId: uuidV4(),
  logLevel: testLogLevel,
  pluginRegistry: new PluginRegistry({ plugins: [] }),
  walletPath: "/home/user/my-wallet",
  invitationDomain: "https://example.org",
  ariesAgents: [
    {
      name: aliceAgentName,
      walletKey: aliceAgentName,
      indyNetworks: [await ledger.getIndyVdrPoolConfig(indyNamespace)],
      inboundUrl: aliceInboundUrl,
      autoAcceptConnections: true,
    },
    {
      name: bobAgentName,
      walletKey: bobAgentName,
      indyNetworks: [await ledger.getIndyVdrPoolConfig(indyNamespace)],
      inboundUrl: bobInboundUrl,
      autoAcceptConnections: true,
    },
  ],
});

// Register endpoints
await connector.getOrCreateWebServices();
await connector.registerWebServices(expressApp, wsApi);

// Initialize Aries agents
await connector.onPluginInit();
```

### Configuration

#### Connector Setup

- `instanceId` - unique ID of the connector
- `logLevel` - connector log level
- `walletPath` - Default Aries agents sqlite wallet location.
  Under this location each agent will create its wallet using agent name.
  Path can be set explicitly for any agent managed by the connector.
- `invitationDomain`: Invitations created by this connector will use invitationDomain.
  Can be overwriten when creating invitation.
- `ariesAgents`: List of aries agent managed by the connector to be created on startup.
  Additional agents can be configured during runtime with `addAriesAgent` connector method.
  See `Agent Setup` section below for details on agent configuration.

#### Agent Setup

- `name`: Aries agent label that will also be used as wallet id.
- `walletKey`: Wallet private key - do not share with anyone.
- `walletPath`: Path to wallet sqlite database to use. If not provided, the connector default path and agent name will be used.
- `indyNetworks`: List of indy networks to connect the agent to.
- `inboundUrl`: Inbound endpoint URL for this agent. Must be unique for this connector. Must contain port.
- `autoAcceptConnections`: Flag to accept new connection by default.
- `autoAcceptCredentials`: Policy of accepting credentials.
- `autoAcceptProofs`: Policy of accepting proof requests.

> **Warning - Currently `autoAcceptConnections`, `autoAcceptCredentials`, and `autoAcceptProofs` are ignored! The defaults are used instead (autoAcceptConnections - `true`, credential and proof policies - `ContentApproved`)**

### Connector Methods

- Connector can be used directly through it's public methods.
- Most methods require `agentName` to identify Aries agent which should perform operation (single connector can control many agents).

#### Methods

```typescript
// Managing Agents
public async getAgents(): Promise<AriesAgentSummaryV1[]>
public async getAriesAgentOrThrow(agentName: string): Promise<AnoncredAgent>
public async addAriesAgent(agentConfig: AriesAgentConfigV1): Promise<AnoncredAgent>
public async removeAriesAgent(agentName: string): Promise<void>
public async importExistingIndyDidFromPrivateKey(agentName: string, seed: string, indyNamespace: string): Promise<string>

// Connecting
public async getConnections(agentName: string, filter: AgentConnectionsFilterV1 = {}): Promise<AgentConnectionRecordV1[]>
public async createNewConnectionInvitation(agentName: string, invitationDomain?: string)
public async acceptInvitation(agentName: string, invitationUrl: string)

// Proof requesting
public async requestProof(agentName: string, connectionId: string, proofAttributes: CactiProofRequestAttributeV1[])
```

## AriesApiClient

All connector API endpoints are defined in [open-api specification](./src/main/json/openapi.json). You can use [AriesApiClient](./src/main/typescript/api-client) to call remote aries connector functions. It also contain additional utility functions to ease integration.

See [DefaultApi](./src/main/typescript/generated/openapi/typescript-axios/api.ts) and [AriesApiClient](./src/main/typescript/api-client/aries-api-client.ts)
for up-to-date listing of supported endpoints.

### REST Functions

- `getAgentsV1`
- `getConnectionsV1`
- `createNewConnectionInvitationV1`
- `acceptInvitationV1`
- `requestProofV1`

### Monitoring methods

- `watchConnectionStateV1`
- `watchProofStateV1`

### Helper methods

- `waitForConnectionReadyV1`
- `waitForInvitedPeerConnectionV1`
- `waitForProofCompletionV1`
- `requestProofAndWaitV1`

## Running the tests

To check that all has been installed correctly and that the plugin has no errors run jest test suites.

- Run this command at the project's root:

```sh
npx jest cactus-plugin-ledger-connector-aries
```

### Example apps
- [Discounted Asset Trade](../../examples/cactus-example-discounted-asset-trade/README.md) sample app uses aries connector to verify remote aries agent employment proof.

## Contributing

We welcome contributions to Hyperledger Cactus in many forms, and there’s always plenty to do!

Please review [CONTRIBUTING.md](../../CONTRIBUTING.md) to get started.

### TODO

- Add option of connecting cacti aries agents directly (invitation / accept performed by connector directly).
- Add create credential option (will register schema and credental definition when necessary).
- Add issue credential option.
- Implement own aries wallet plugin that will use our keychain plugin as secure storage.
- Write functional test for proof verification.

## License

This distribution is published under the Apache License Version 2.0 found in the [LICENSE](../../LICENSE) file.

## Acknowledgments

```

```
