## Mission and Objectives

Cacti aims to make the process of interoperation, interconnection, and integration of systems built on blockchain or DLT with each other (or with centralized systems) easy, controllable, trustworthy, and decentralized. It will allow networks to remain self-sovereign and evolve independently without losing the ability to link with other networks and manage digital assets across networks when required. In effect, it enables a _network-of-networks_, or a global scale decentrantralized system of networks (akin to the Internet) without forcing all networks to coalesce, or subscribe to, a single canonical chain.

## Project Scope

The existence of several blockchain and distributed ledger technologies of different flavors in the market as well as networks of varying scopes and sizes built on them necessitates the need for interoperability and integration, lest we end up with a fragmented ecosystem where digital assets and the workfows (often contracts) governing them remain isolated in silos. The solution to this is not to force all chains to coalesce (i.e., "*a single chain to rule them all*") but rather enable the networks to orchestrate transactions spanning their boundaries without sacrificing security, privacy, or governance autonomy (i.e., self-sovereignty). Hyperledger Cacti offers a family of protocols, modules, libraries, and SDKs, that can enable one network to be interoperable with, and carry out transactions directly with, another while eschewing the need for a central or common settlement chain. Cacti will allow networks to share ledger data, and exchange and transfer assets atomically, and manage identities, across their boundaries, as illustrated in the figure below.

<img src="../images/cacti-vision.png">

As a fusion of two earlier systems (Cactus and Weaver) that have similar philosophies and goals, yet offer distinct mechanisms backed by differemt design and trust assumptions, Cacti offers a spectrum of selectable and configurable features for cross-network transaction orchestrations. An example illustrated below shows how distributed applications running on Fabric and Besu ledgers respectively can carry out the same set of cross-network transactions using the **Node Server** (Cactus legacy) or through **Relays** (Weaver legacy).

<img src="../images/tx-orchestration-modes.png">

The present (initial) version of the Cacti code base is simply an aggregation of the legacy Cactus and Weaver code bases with their original folder structures. Until merge and integration (see further below), users should examine, test, and use them separately as follows:
- Cactus code and documentation lies within this (root) folder, excluding the `weaver` folder. See [Cactus documentation](./README-cactus.md) to test and use Cactus.
- Weaver code and documentation lies within the [weaver](./weaver/) folder. See [Weaver documentation](./weaver/README.md) to test and use Weaver.

## Project Roadmap

You can find the project roadmap in the [GitHub repository](https://github.com/hyperledger-cacti/cacti/blob/main/ROADMAP.md).
