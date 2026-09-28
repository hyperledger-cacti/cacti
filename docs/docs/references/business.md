# Business Use Cases for Cacti

Hyperledger Cacti provides implementations of the Secure Asset Transfer
Protocol (SATP). The following representative scenarios are derived from the
[IETF Secure Asset Transfer use cases Internet Draft](https://datatracker.ietf.org/doc/draft-ietf-satp-usecases/).
They illustrate where Cacti's SATP implementations may be applied and are not
claims of production deployments. The cited Internet draft is a work in
progress and may change before publication.

## International Trade and Supply Chains

- **Trade finance and logistics:** Independent trade finance and logistics
  networks can exchange verifiable letters of credit, bills of lading, and
  related workflow information. These records can also be transferred between
  networks when they represent digital assets.
- **Food shipment tracking:** Food tracking and logistics networks can share
  purchase orders, shipment history, and condition information to provide
  end to end supply chain visibility.
- **Supply chain coordination:** Trade finance, logistics, payment, and
  regulatory compliance networks can coordinate payment obligations,
  settlement confirmations, and compliance records without merging their
  underlying systems.

## Currency and Finance

- **Currency transfers:** Tokenized currency can move between wholesale and
  retail central bank digital currency (CBDC) networks, or between separate
  retail CBDC networks.
- **Multi CBDC settlement:** National CBDC networks can transfer assets to and
  from a shared multi CBDC network while preserving asset consistency.
- **Delivery versus payment:** Securities and payment networks can coordinate
  an atomic exchange so that the security and its payment are either both
  transferred or neither is transferred.
- **Stock option fulfilment:** An options contract can be transferred across
  networks and fulfilled against a payment recorded on an independent payment
  network.

## Decentralized Commerce

- **Digital art and cross border payments:** Tokenized digital artwork can be
  transferred across networks together with payment and records needed for
  accountability.
- **Streaming services:** Content and payment networks can support
  usage based streaming payments while remaining operationally independent.

## Internet Infrastructure

- **DNS resource record migration:** SATP can complement the Extensible
  Provisioning Protocol by coordinating transfers of tokenized domain records
  between registrars that use different ledger networks.
