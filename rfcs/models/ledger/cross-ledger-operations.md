<!--
 Copyright IBM Corp. All Rights Reserved.

 SPDX-License-Identifier: CC-BY-4.0
 -->
# Inter-Network Operations on Resources

- RFC: 01-005
- Authors: Venkatraman Ramakrishna
- Status: Draft
- Since: 02-11-2020

## Summary

* Interaction between networks is asymmetrical, with either end assuming a designated role that complements the other to fulfill a requirement.
* There is a direct analogy between such interaction and the HTTP protocol, which is based on the client-server model.
* In both cases, an instance of a protocol will consist of a request and a response, with optional processing at either end before a message is sent and after a message is received.
* It makes sense to think of a network's possessions (assets and data) and capabilities as *resources* upon which a range of *operations* can be performed.
  * Each instance of a protocol will be a `<resource, operation>` tuple just like an HTTP request/response cycle can be represented as a `<URL, method>` tuple.
  * A [view](views.md) in this model is a specific `<resource, operation>` category rather than the most general abstraction of interaction between two networks.

## Resource Specification and Addressing

This is covered in the [Views](views.md) proposal.

## List of Operations

The list of operations is an extension of what HTTP supports. We need more than HTTP because a blockchain network is significantly different from a typical client or server.

* Create resource (equivalent of an HTTP POST)
* Read resource (equivalent of an HTTP GET)
* Update resource (equivalent of an HTTP PUT)
* Delete resource (equivalent of an HTTP DELETE)
* Send resource (dissemination of an event)
* Transfer resource (move an asset)
* Request/fetch resource (acquire an asset)
* Complex atomic operations:
  * Exchange resource (transfer + fetch) (this is like an *atomic swap*)
  * Simultaneously update resource states (update + update)
  * <*any other combination*>?

