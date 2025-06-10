// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.7.0;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title OracleTestContract
 * The OracleTestContract is a example costum contract .
 */
contract OracleTestContract is AccessControl {

    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE_ROLE");

    struct DataRecord {
        bytes32 id;
        string data;
    }

    event UpdatedData(bytes32 id, string data, uint256 nonce);

    mapping(bytes32 => DataRecord) private records;

    uint256 private nonce = 0;

    function getNonce() external view returns (uint256) {
        return nonce;
    }

    function incrementNonce() internal onlyRole(ORACLE_ROLE) {
        nonce++;
    }

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ORACLE_ROLE, msg.sender);
    }

    function setData(string memory data) external  onlyRole(ORACLE_ROLE) {
        bytes32 dataId = keccak256(abi.encodePacked(data));

        records[dataId] = DataRecord(dataId, data);

        incrementNonce();

        emit UpdatedData(dataId, data, nonce);
    }

    function getData(bytes32 id) external view returns (string memory) {
        if (records[id].id == 0) {
            revert("Data not found");
        }
        return records[id].data;
    }
}