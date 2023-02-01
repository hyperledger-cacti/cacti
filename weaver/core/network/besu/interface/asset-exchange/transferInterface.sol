// SPDX-License-Identifier: Apache-2.0

pragma solidity ^0.8.8;

/**
 * Transfer Interface for asset exchange on Assets in an Ethereum network
 **/

library transferStruct {
    struct Info {
        address sender;
        address receiver;
        uint256 amount;
        uint256 tokenId;
        bytes data;
    }
}

abstract contract transferInterface {
    function transferInterop(transferStruct.Info memory info)
        external
        virtual
        returns (bool success);

    function allowanceInterop(transferStruct.Info memory info)
        external
        virtual
        returns (bool success);
}
