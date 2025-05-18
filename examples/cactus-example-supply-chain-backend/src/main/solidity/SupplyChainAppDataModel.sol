// SPDX-License-Identifier: Apache-2.0

pragma solidity ^0.7.0;

library SupplyChainAppDataModelLib {

    struct BambooHarvestEntity {
        string id;
        string location;
        string startedAt;
        string endedAt;
        string harvester;
    }

    struct BookshelfEntity {
        string id;
        uint8 shelfCount;
        string bambooHarvestId;
    }
}