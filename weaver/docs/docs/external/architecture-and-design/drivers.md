---
id: drivers
title: Drivers
---

<!--
 Copyright IBM Corp. All Rights Reserved.

 SPDX-License-Identifier: CC-BY-4.0
 -->

The driver is responsible for all communication between the relay and its network. In the previous sections we have thought about the driver as a component of the relay. We have done this because conceptually it makes sense to think about it like that. However, in our reference implementation we have made it a seperate process which communicates with the relay via gRPC, as shown below. There are two main reasons for this:

1. There must exist a different driver for each network type (e.g. Fabric, Corda etc.) and therefore having the driver as a seperate process makes it easy to "plug" different drivers into the relay.
1. A possible use case of the relay is that a single relay instance may have multiple drivers (e.g. if multiple entities in the network want to run their own driver). In this case, this plugin style approach of drivers makes it possible to do without having to modify code for each configuration.

![](/architecture-assets/driver_architecture.png)
