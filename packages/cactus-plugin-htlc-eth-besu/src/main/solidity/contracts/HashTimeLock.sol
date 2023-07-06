// SPDX-License-Identifier: Apache-2.0

pragma solidity 0.8.19;

contract HashTimeLock {
    mapping(bytes32 => LockContract) public contracts;

    //                   / - WITHDRAWN
    // INVALID - ACTIVE |
    //                   \ - EXPIRED - REFUNDED

    uint256 constant INIT = 0; // Uninitialized  swap -> can go to ACTIVE
    uint256 constant ACTIVE = 1; // Active swap -> can go to WITHDRAWN or EXPIRED
    uint256 constant REFUNDED = 2; // Swap is refunded -> final state.
    uint256 constant WITHDRAWN = 3; // Swap is withdrawn -> final state.
    uint256 constant EXPIRED = 4; // Swap is expired -> can go to REFUNDED

    struct LockContract {
        uint256 inputAmount;
        uint256 outputAmount;
        uint256 expiration;
        uint256 status;
        bytes32 hashLock;
        address payable sender;
        address payable receiver;
        string outputNetwork;
        string outputAddress;
    }

    event Withdraw(
        bytes32 indexed id, bytes32 secret, bytes32 hashLock, address indexed sender, address indexed receiver
    );

    event Refund(bytes32 indexed id, bytes32 hashLock, address indexed sender, address indexed receiver);

    event NewContract(
        uint256 inputAmount,
        uint256 outputAmount,
        uint256 expiration,
        bytes32 indexed id,
        bytes32 hashLock,
        address indexed sender,
        address indexed receiver,
        string outputNetwork,
        string outputAddress
    );

    function newContract(
        uint256 outputAmount,
        uint256 expiration,
        bytes32 hashLock,
        address payable receiver,
        string calldata outputNetwork,
        string calldata outputAddress
    ) external payable {
        address payable sender = payable(msg.sender);
        uint256 inputAmount = msg.value;

        require(expiration > block.timestamp, "INVALID_TIME");

        require(inputAmount > 0, "INVALID_AMOUNT");

        bytes32 id = keccak256(abi.encode(sender, receiver, inputAmount, hashLock, expiration));

        require(contracts[id].status == INIT, "SWAP_EXISTS");

        contracts[id] = LockContract(
            inputAmount, outputAmount, expiration, ACTIVE, hashLock, sender, receiver, outputNetwork, outputAddress
        );

        emit NewContract(
            inputAmount, outputAmount, expiration, id, hashLock, sender, receiver, outputNetwork, outputAddress
        );
    }

    function withdraw(bytes32 id, bytes32 secret) external {
        LockContract storage c = contracts[id];

        require(c.status == ACTIVE, "SWAP_NOT_ACTIVE");

        require(c.expiration > block.timestamp, "INVALID_TIME");

        require(c.hashLock == keccak256(abi.encode(secret)), "INVALID_SECRET");

        c.status = WITHDRAWN;

        c.receiver.transfer(c.inputAmount);

        emit Withdraw(id, secret, c.hashLock, c.sender, c.receiver);
    }

    function refund(bytes32 id) external {
        LockContract storage c = contracts[id];

        require(c.status == ACTIVE, "SWAP_NOT_ACTIVE");

        require(c.expiration <= block.timestamp, "INVALID_TIME");

        c.status = REFUNDED;

        c.sender.transfer(c.inputAmount);

        emit Refund(id, c.hashLock, c.sender, c.receiver);
    }

    function getStatus(bytes32[] memory ids) public view returns (uint256[] memory) {
        uint256[] memory result = new uint256[](ids.length);

        for (uint256 index = 0; index < ids.length; index++) {
            result[index] = getSingleStatus(ids[index]);
        }

        return result;
    }

    function getSingleStatus(bytes32 id) public view returns (uint256 result) {
        LockContract memory tempContract = contracts[id];

        if (tempContract.status == ACTIVE && tempContract.expiration < block.timestamp) {
            result = EXPIRED;
        } else {
            result = tempContract.status;
        }
    }

    function contractExists(bytes32 id) public view returns (bool result) {
        LockContract memory tempContract = contracts[id];

        if (tempContract.status == INIT) {
            return false;
        } else {
            return true;
        }
    }
}
