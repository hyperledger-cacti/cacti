// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

contract PrivateHashTimeLock {
    mapping(bytes32 => LockContract) private contracts;

    //                   / - WITHDRAWN
    // INVALID - ACTIVE |
    //                   \ - EXPIRED - REFUNDED

    uint256 private constant INIT = 0; // INIT  swap -> can go to ACTIVE
    uint256 private constant ACTIVE = 1; // Active swap -> can go to WITHDRAWN or EXPIRED
    uint256 private constant REFUNDED = 2; // Swap is refunded -> final state.
    uint256 private constant WITHDRAWN = 3; // Swap is withdrawn -> final state.
    uint256 private constant EXPIRED = 4; // Swap is expired -> can go to REFUNDED

    struct PrivateEnhancing {
        // should be large
        uint256 generator;
        // should be large
        uint256 modulus;
    }

    struct SwapDetails {
        address payable sender;
        address payable receiver;
        uint256 inputAmount;
        bytes32 hashSecret;
        uint256 expiration;
    }

    struct LockContract {
        uint256 inputAmount;
        uint256 outputAmount;
        uint256 expiration;
        uint256 status;
        bytes32 hashSecret;
        address payable sender;
        address payable receiver;
        string outputNetwork;
        string outputAddress;
        PrivateEnhancing priv;
    }

    event Withdraw(
        bytes32 indexed id, bytes32 secret, bytes32 hashSecret, address indexed sender, address indexed receiver
    );

    event Refund(bytes32 indexed id, bytes32 hashSecret, address indexed sender, address indexed receiver);

    event NewContract(
        uint256 inputAmount,
        uint256 outputAmount,
        uint256 expiration,
        bytes32 indexed id,
        bytes32 hashSecret,
        address indexed sender,
        address indexed receiver,
        string outputNetwork,
        string outputAddress,
        PrivateEnhancing priv
    );

    function newPrivateContract(
        uint256 outputAmount,
        uint256 expiration,
        bytes32 hashLock,
        address payable receiver,
        string memory outputNetwork,
        string memory outputAddress,
        PrivateEnhancing memory priv
    ) external payable {
        address payable sender = payable(msg.sender);
        uint256 inputAmount = msg.value;

        require(expiration > block.timestamp, "INVALID_TIME");

        require(inputAmount > 0, "INVALID_AMOUNT");

        bytes32 id = keccak256(abi.encodePacked(sender, receiver, inputAmount, hashLock, expiration));

        require(contracts[id].status == INIT, "SWAP_EXISTS");
        require(priv.generator > 0);
        require(priv.modulus > 0);

        contracts[id] = LockContract(
            inputAmount,
            outputAmount,
            expiration,
            ACTIVE,
            hashLock,
            sender,
            receiver,
            outputNetwork,
            outputAddress,
            priv
        );

        emit NewContract(
            inputAmount, outputAmount, expiration, id, hashLock, sender, receiver, outputNetwork, outputAddress, priv
        );
    }

    function withdraw(bytes32 id, bytes32 secret) external {
        LockContract storage c = contracts[id];
        require(c.status == ACTIVE, "SWAP_NOT_ACTIVE");

        require(c.expiration > block.timestamp, "INVALID_TIME");

        require(
            c.hashSecret == calculateHashSecret(c.priv.generator, uint256(secret), c.priv.modulus), "INVALID_SECRET"
        );

        c.status = WITHDRAWN;

        c.receiver.transfer(c.inputAmount);

        emit Withdraw(id, secret, c.hashSecret, c.sender, c.receiver);
    }

    function calculateHashSecret(uint256 base, uint256 exponent, uint256 modulus)
        internal
        pure
        returns (bytes32 result)
    {
        require(modulus > 0, "Modulus cannot be 0");
        require(base > 0, "base cannot be 0");
        require(exponent > 0, "exponent_1 cannot be 0");

        return bytes32((base ** exponent) % modulus);
    }

    function refund(bytes32 id) external {
        LockContract storage c = contracts[id];

        require(c.status == ACTIVE, "SWAP_NOT_ACTIVE");

        require(c.expiration <= block.timestamp, "INVALID_TIME");

        c.status = REFUNDED;

        c.sender.transfer(c.inputAmount);

        emit Refund(id, c.hashSecret, c.sender, c.receiver);
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
