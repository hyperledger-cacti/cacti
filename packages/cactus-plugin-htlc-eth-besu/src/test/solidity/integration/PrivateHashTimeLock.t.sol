pragma solidity 0.8.19;

import {PrivateHashTimeLock} from "../../../main/solidity/contracts/PrivateHashTimeLock.sol";
import "forge-std/Test.sol";
import "forge-std/console2.sol";

contract PrivateHashTimeLockTest is Test {
    event newPrivateContract(
        uint256 inputAmount,
        uint256 outputAmount,
        uint256 expiration,
        bytes32 indexed id,
        bytes32 hashSecret,
        address indexed sender,
        address indexed receiver,
        string outputNetwork,
        string outputAddress,
        PrivateHashTimeLock.PrivateEnhancing priv
    );

    bytes32 AliceSecret;
    bytes32 HashedAliceSecret;
    bytes32 Z;

    function setUp() public {
        AliceSecret = bytes32(0x0000000000000000000000000000000000000000000000000000000000000003);
        HashedAliceSecret = bytes32(0x0000000000000000000000000000000000000000000000000000000000000017);
        Z = bytes32(0x000000000000000000000000000000000000000000000000000000000000001a);
    }

    function test_Deployment() public {
        new PrivateHashTimeLock();
    }

    function test_initializeHTLC() public {
        // 5 eth
        uint256 inputAmountEth = 5;
        uint256 outputAmount = 5000000000000000000;
        // 1/1/2030
        uint256 expiration = 1893515539;
        bytes32 hashLock = (0x0000000000000000000000000000000000000000000000000000000000000017);
        // account # 1 of anvil -a 10
        address payable receiver = payable(0x70997970C51812dc3A010C7d01b50e0d17dc79C8);
        string memory outputNetwork = "anvil";
        string memory outputAddress = vm.toString(msg.sender);
        PrivateHashTimeLock.PrivateEnhancing memory priv =
            PrivateHashTimeLock.PrivateEnhancing({generator: 11, modulus: 109});

        PrivateHashTimeLock HtlcManager = new PrivateHashTimeLock();
        console.log("Deployed HTLC: ", address(HtlcManager));

        vm.expectCall(
            address(HtlcManager),
            5,
            abi.encodeWithSelector(
                HtlcManager.newPrivateContract.selector,
                outputAmount,
                expiration,
                hashLock,
                receiver,
                outputNetwork,
                outputAddress,
                priv
            ),
            1
        );
        //vm.expectEmit(true, true, false, true, address(HtlcManager));
        vm.recordLogs();

        HtlcManager.newPrivateContract{value: inputAmountEth}(
            outputAmount, expiration, hashLock, receiver, outputNetwork, outputAddress, priv
        );

        Vm.Log[] memory entries = vm.getRecordedLogs();

        // get contract id from event
        assertEq(entries.length, 1);
        bytes32 id = entries[0].topics[1];

        bool exists = HtlcManager.contractExists(id);
        assert(exists);

        // state is active
        assert(HtlcManager.getSingleStatus(id) == 1);
    }

    function test_process_secret() public {
        // 5 eth
        uint256 inputAmountEth = 5;
        uint256 outputAmount = 5000000000000000000;
        // 1/1/2030
        uint256 expiration = 1893515539;
        bytes32 hashLock = (0x0000000000000000000000000000000000000000000000000000000000000017);
        // account # 1 of anvil -a 10
        address payable receiver = payable(0x70997970C51812dc3A010C7d01b50e0d17dc79C8);
        string memory outputNetwork = "anvil";
        string memory outputAddress = vm.toString(msg.sender);
        PrivateHashTimeLock.PrivateEnhancing memory priv =
            PrivateHashTimeLock.PrivateEnhancing({generator: 11, modulus: 109});

        PrivateHashTimeLock HtlcManager = new PrivateHashTimeLock();
        vm.expectCall(
            address(HtlcManager),
            5,
            abi.encodeWithSelector(
                HtlcManager.newPrivateContract.selector,
                outputAmount,
                expiration,
                hashLock,
                receiver,
                outputNetwork,
                outputAddress,
                priv
            ),
            1
        );
        vm.recordLogs();

        HtlcManager.newPrivateContract{value: inputAmountEth}(
            outputAmount, expiration, hashLock, receiver, outputNetwork, outputAddress, priv
        );

        Vm.Log[] memory entries = vm.getRecordedLogs();

        // get contract id from event
        assertEq(entries.length, 1);
        bytes32 id = entries[0].topics[1];

        // secret is 3 decimal, hashes to 0x17
        bytes32 secret = 0x0000000000000000000000000000000000000000000000000000000000000003;

        emit log_bytes32(secret);
        emit log_uint(uint256(secret));
        HtlcManager.withdraw(id, secret);
    }

    function test_mod_exp() public {
        uint256 base = 11;
        uint256 exponent = 3;
        uint256 modulus = 109;
        uint256 result = calculateHashSecret(base, exponent, modulus);
        emit log_uint(result);
        assert(result == 23);

        bytes32 modulus_bytes = bytes32(modulus);
        bytes32 base_bytes = bytes32(base);
        bytes32 exponent_bytes = bytes32(exponent);
        uint256 result2 = calculateHashSecret(uint256(base_bytes), uint256(exponent_bytes), uint256(modulus_bytes));
        emit log_uint(result2);
        assert(result2 == 23);
    }

    function calculateHashSecret(uint256 base, uint256 exponent, uint256 modulus)
        internal
        view
        returns (uint256 result)
    {
        require(modulus > 0, "Modulus cannot be 0");
        require(base > 0, "base cannot be 0");
        require(exponent > 0, "exponent_1 cannot be 0");

        return (base ** exponent) % modulus;
    }
}
