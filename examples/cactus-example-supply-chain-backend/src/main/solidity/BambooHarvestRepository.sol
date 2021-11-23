// SPDX-License-Identifier: Apache-2.0

pragma solidity ^0.7.0;
pragma experimental ABIEncoderV2;

import { SupplyChainAppDataModelLib as model } from "./SupplyChainAppDataModel.sol";

contract BambooHarvestRepository {

    model.BambooHarvestEntity[] records;

    function getAllRecords() public view returns(model.BambooHarvestEntity[] memory)
    {
        return records;
    }

    function insertRecord(
        model.BambooHarvestEntity memory record
    )
        public
        returns(bool success)
    {
        records.push(record);
        return true;
    }
}
