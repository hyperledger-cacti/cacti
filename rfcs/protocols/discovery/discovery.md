<!--
 Copyright IBM Corp. All Rights Reserved.

 SPDX-License-Identifier: CC-BY-4.0
 -->
# Discovery Protocol

- RFC: 02-013
- Authors: Bishakh Chandra Ghosh, Venkatraman Ramakrishna, Krishnasuri Narayanam, Ermyas Abebe
- Status: Draft
- Since: 25-Jul-2021


## Summary

When a network ("local network" from here on) tries to configure the identity of another network ("foreign network" from here on) for interoperation, the broad steps involved are (i) Network Discovery (ii) Network Identity Validation. Both these steps are carried out by the IIN agent of the participants of the local network.

Whether each participant needs to carry out the discovery and validation, or a subset of participants will do it depends entirely on the trust basis of the network. This is covered in Network Identity Configuration step.


> Note: It is the IIN's responsibility to authenticate a Network DID creation or updation. Therefore, local network must trust the IIN to trust the fact that the resolved Network DID is created by proper attestations from its controller participants. Given a DLT based IIN which allows anyone to monitor the ledger, any IIN agent can validate the authenticity of a Network DID by validating the Network DID creation/updation requests from the ledger.
