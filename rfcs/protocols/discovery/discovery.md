<!--
 Copyright IBM Corp. All Rights Reserved.

 SPDX-License-Identifier: CC-BY-4.0
 -->
# Discovering Foreign Security Domains

- RFC: 02-013
- Authors: Bishakh Chandra Ghosh, Venkatraman Ramakrishna, Krishnasuri Narayanam, Ermyas Abebe
- Status: Draft
- Since: 27-Aug-2022


## Summary

This document covers the process by which a network (or security domain) discovers the identity of another as a prelude to [validation](../identity/security-domain-identity-validation.md) and [syncing of membership information](../identity/membership-syncing.md).

At its simplest, this can be a trivial exercise of hitting a well-known website that serves DID records for the security domains one is interesting in interoperating with. But more complex situations are possible, involving multiple IINs and name resolution services.
