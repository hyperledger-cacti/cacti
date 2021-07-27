# Cactus discounted-cartrade

## Abstract

Cactus discounted-cartrade is a sample application that adds employee discounts to the original Cactus cartrade. In this application, when the users transfer the car ownership in the cactus cartrade, they present their employee proofs to the rent-a-car company to receive an employee discount. We implement the employee proofs by proofs on Hyperledger Indy. As with the original application, car ownership is represented by a Fabcar chaincodetoken on Hyperledger Fabric, which can be exchanged for ETH currency on a private Ethereum blockchain. This Business Logic Plugin (BLP) application controls a process from employee certification using Hyperledger Indy to payment using Ethereum.

![discounted-cartrade image](./images/discounted-cartrade-image.png)

## Scenario

The application works in the following scenario:

### Settings

Alice wants to rent a car using the services of rental car company Thrift Corp. Alice chose this company because she is an employee of Acme Corp., which offers discounts on Thrift Corp.'s services as a benefit.

** Note ** : Acme Corp and Thrift Corp have the same names on the sample application on Hyperledger Indy.

### Preparations

Alice knows that Acme Corp. provides digital certificates. She asks Acme Corp. to issue a credential when she uses various services, and the company issues it.

### When Alice Uses the Service

Alice will use credentials and other Indy formats such as schema and definition to create an employee proof that she will present when applying the lent-a-car service. Alice then sends a car usage application and her employee proof to the Cactus Node Server via an End User Application. The employee proofs consist of proof requests and proofs on Hyperledger Indy. The Cactus Node server receives the schema and definition from the Indy ledger via Validator and uses this information to verify the proof with the BLP. Once verified, the BLP will decide what she should pay based on the price list and then proceed with the original cartrade application using cactus as an escrow to transfer ETH currencies and car ownership tokens to each other.
