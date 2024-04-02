# `@hyperledger/cactus-plugin-ccmodel-hephaestus`

The package provides `Hyperledger Cacti` a way to generate process models from arbitrary cross-chain use cases. The implementation follows the paper [Hephaestus](https://www.techrxiv.org/doi/full/10.36227/techrxiv.20718058.v3).

With this plugin it will be possible to generate cross-chain models from local transactions in different ledgers (currently supports Besu, Ethereum, and Fabric), realizing arbitrary cross-chain use cases and allowing operators to monitor their applications.
Through monitoring, errors like outliers and malicious behavior can be identified, which can enable programmatically stopping attacks (circuit breaker), including bridge hacks.

## Summary

- [`@hyperledger/cactus-plugin-ccmodel-hephaestus`](#hyperledgercactus-plugin-ccmodel-hephaestus)
  - [Summary](#summary)
  - [Getting Started](#getting-started)
    - [Prerequisites](#prerequisites)
  - [Architecture](#architecture)
    - [RxJS Transaction Monitoring](#rxjs-transaction-monitoring)
    - [Cross-Chain Model Pipeline](#cross-chain-model-pipeline)
    - [PM4Py Overview](#pm4py-overview)
  - [Running the tests](#running-the-tests)
  - [Usage](#usage)
  - [Contributing](#contributing)
  - [License](#license)


## Getting Started

Clone the git repository on your local machine. Follow these instructions that will get you a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

In the root of the project to install the dependencies execute the command:
```sh
npm run configure
```

Know how to use the following plugins of the project:

  - [cactus-plugin-ledger-connector-besu](https://github.com/hyperledger/cactus/tree/main/packages/cactus-plugin-ledger-connector-besu)
  - [cactus-plugin-ledger-connector-ethereum](https://github.com/hyperledger/cactus/tree/main/packages/cactus-plugin-ledger-connector-ethereum)
  - [cactus-plugin-ledger-connector-fabric](https://github.com/hyperledger/cactus/tree/main/packages/cactus-plugin-ledger-connector-fabric)


## Architecture

### RxJS Transaction Monitoring

This plugin utilizes RxJS (Reactive Extensions for JavaScript) to monitor transactions issued in Hyperledger Besu, Hyperledger Ethereum, and Hyperledger Fabric connectors.

RxJS provides a powerful framework for asynchronous or callback-based code, each connector maintains an RxJS `ReplaySubject`, named `txSubject`, which acts as a message bus for emitting transaction data.

- When a transaction is issued in a connector, the `ReplaySubject` stores the value it observes in an internal buffer. This observation is achieved by passing the value to its `next` method.
- When a new subscriber subscribes to the `txSubject`, it synchronously emits all values in its buffer in a First-In-First-Out (FIFO) manner. This ensures that subscribers receive the most recent transactional data, regardless of when they subscribe.
- The transactional data emitted includes essential information such as the transaction ID, timestamp, and other parameters, which are necessary for creating transaction receipts within the plugin.

### Cross-Chain Model Pipeline

The plugin employs a structured pipeline to create a cross-chain model from monitored connector transactions:

1. **Transaction Emission**: Connectors issue local transactions against their respective target blockchains. Each transaction's data is emitted by the `txSubject` to the subscribers within our plugin.

2. **Receipt Polling**: Upon receiving of transactional data, the plugin processes it into transaction receipts. This step involves precessing transactional information received such as transaction IDs, timestamps, and other parameters.

3. **Cross-Chain Event Logging**: Processed receipts information can then be used to create cross-chain events, forming a cross-chain event log.

4. **Cross-Chain Model**: The plugin uses the cross chain event log to create the cross-chain model with the information received from the connectors, using the Process Mining for Python (PM4PY) library. This model can then be used to verify new and unmodeled transactional information received from the connectors.

### PM4Py Overview

[PM4Py](https://pm4py.fit.fraunhofer.de/) is an open-source library designed for process mining, that provides tools to analyze and visualize business processes.
With it we can generate process models from the event logs created from transactional data and compare event logs with process models to identify deviations.

## Running the tests
  - **basic-mock-test.test.ts**: Conducts the simulation of a transaction without instantiating the connectors, and tests that the plugin monitors, captures, and processes the transactional data and creates a cross-chain event.
  - **monitor-4-besu-events.test.ts**: Tests the plugin's ability to monitor, capture, and process the transactional data from besu connectors, and exports transactional data, in both CSV and JSON formats, as cross-chain event logs.
  - **monitor-4-ethereum-events.test.ts**: Tests the plugin's ability to monitor, capture, and process the transactional data from ethereum connectors, and exports transactional data, in both CSV and JSON formats, as cross-chain event logs.
  - **monitor-4-fabric-events.test.ts**: Tests the plugin's ability to monitor, capture, and process the transactional data from fabric connectors, and exports transactional data, in both CSV and JSON formats, as cross-chain event logs.
  - **monitor-besu-ethereum-fabric-events.test.ts**: Tests the plugin's ability to monitor transactional data from besu, ethereum, and fabric connectors at the same time.
  - **cross-chain-model-serialization.test.ts**: Tests the plugin's ability to create the cross-chain model using the PM4PY (Process Mining for Python) library and save it serialized.
  - **cross-chain-model-conformance-checking.test.ts**: Tests the plugin's ability to check the conformity of unmodeled transactions against the cross-chain model using the PM4PY (Process Mining for Python) library.
  - **cross-chain-model-periodic-update.test.ts**: Tests the plugin's ability to periodically update the cross-chain model with received transactional data.

## Usage
Let us consider three conectors: one connected to Hyperledger Besu and, another connected to Hyperledger Ethereum, and a third connected to Hyperledger Fabric. To monitor cross-chain transactions and create a cross-chain model we should follow the next steps.

After instantiating the connectors, we instantiate the plugin as follows:
```typescript
let hephaestusOptions: IPluginCcModelHephaestusOptions;

hephaestusOptions = {
  instanceId: randomUUID(),
  logLevel: logLevel,
  besuTxObservable: besuConnector.getTxSubjectObservable(),
  ethereumTxObservable: ethereumConnector.getTxSubjectObservable(),
  fabricTxObservable: fabricConnector.getTxSubjectObservable(),
};
hephaestus = new CcModelHephaestus(hephaestusOptions);
```

We set the desired caseID and start monitoring and processing the transactions into transaction receipts:

```typescript
hephaestus.setCaseId("Desired_CaseID");
hephaestus.monitorTransactions();
```

We can create cross-chain events from processed transaction receipts and add them to the cross-chain event log:

```typescript
hephaestus.txReceiptToCrossChainEventLogEntry();
```

We can export the transactional data captured to CSV and JSON files:

```typescript
hephaestus.persistCrossChainLogCsv("output-file-CSV");
hephaestus.persistCrossChainLogJson("output-file-JSON");
```

We can create the cross-chain model with events created from the transactional data captured:
```typescript
await hephaestus.createModel();
```

We can periodically update the cross-chain model with events created from the transactional data captured:
```typescript
const timeInterval = 10000;
const fileName = "file-with-modeled-logs"
await hephaestus.periodicCCModelUpdate(
      fileName,
      timeInterval,
    );
await hephaestus.stopPeriodicCCModelUpdate(fileName);
```

After creating or updating a model with the desired event logs, we can perform a conformance check of the newly received transactional data against the model:
```typescript
const model = hephaestus.getModel(CrossChainModelType.PetriNet);
hephaestus.setIsModeling(false);
//receive more transactional data from connectors
await hephaestus.checkConformance(model);
```


## Contributing
We welcome contributions to Hyperledger Cactus in many forms, and there’s always plenty to do!

Please review [CONTIRBUTING.md](https://github.com/hyperledger/cactus/blob/main/CONTRIBUTING.md "CONTIRBUTING.md") to get started.

## License
This distribution is published under the Apache License Version 2.0 found in the [LICENSE ](https://github.com/hyperledger/cactus/blob/main/LICENSE "LICENSE ")file.