<!--
 Copyright IBM Corp. All Rights Reserved.

 SPDX-License-Identifier: CC-BY-4.0
 -->
# Cacti Fabric-Driver

The term "driver" has been used in Weaver parlance, and is synonymous with "connector" as used in Cactus (and not in Cacti). Both terms refer to a module with an interface and functions to "connect" to a ledger of a given DLT type and "drive" transactions through that ledger for querying and state update purposes whenever required in the context of a cross-network transaction.
There are some distinctive features of the Weaver Fabric driver that are not covered by the Cactus Fabric connector package, which is why the two continue to co-exist at this time. Our goal is to eventually merge them into a single connector/driver package that offers both the distinctive and overlapping features of both the existing packages.

For detailed information about fabric driver visit [here](src/main/typescript/readme.md).

To use fabric-driver in your application please refer [documentation](https://hyperledger-cacti.github.io/cacti/weaver/getting-started/guide/). 


