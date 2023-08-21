pragma solidity 0.8.19;

import {HashTimeLock} from "../../../main/solidity/contracts/HashTimeLock.sol";
import "forge-std/Test.sol";
import "forge-std/console2.sol";

contract HashTimeLockTest is Test {

    bytes32 AliceSecret;
    bytes32 HashedAliceSecret;
    bytes32 Z;

    function setUp() public {
        AliceSecret = bytes32(0x0000000000000000000000000000000000000000000000000000000000000003);
        // keccak256(abi.encodePacked(AliceSecret));
        HashedAliceSecret = bytes32(0xc2575a0e9e593c00f959f8c92f12db2869c3395a3b0502d05e2516446f71f85b);
    }

    function test_Deployment() public {
        new HashTimeLock();
    }

    function test_initializeHTLC() public {
        // 5 eth
        uint256 inputAmountEth = 5;
        uint256 outputAmount = 5000000000000000000;
        // 1/1/2030
        uint256 expiration = 1893515539;
        // account # 1 of anvil -a 10
        address payable receiver = payable(0x70997970C51812dc3A010C7d01b50e0d17dc79C8);
        string memory outputNetwork = "anvil";
        string memory outputAddress = vm.toString(msg.sender);


        HashTimeLock HtlcManager = new HashTimeLock();
        console.log("Deployed HTLC: ", address(HtlcManager));

        vm.expectCall(
            address(HtlcManager),
            5,
            abi.encodeWithSelector(
                HtlcManager.newContract.selector,
                outputAmount,
                expiration,
                HashedAliceSecret,
                receiver,
                outputNetwork,
                outputAddress
            ),
            1
        );
        
        //vm.expectEmit(true, true, false, true, address(HtlcManager));
        vm.recordLogs();

        HtlcManager.newContract{value: inputAmountEth}(
            outputAmount, expiration, HashedAliceSecret, receiver, outputNetwork, outputAddress
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
        // account # 1 of anvil -a 10
        address payable receiver = payable(0x70997970C51812dc3A010C7d01b50e0d17dc79C8);
        string memory outputNetwork = "anvil";
        string memory outputAddress = vm.toString(msg.sender);


        HashTimeLock HtlcManager = new HashTimeLock();
        console.log("Deployed HTLC: ", address(HtlcManager));

        vm.expectCall(
            address(HtlcManager),
            5,
            abi.encodeWithSelector(
                HtlcManager.newContract.selector,
                outputAmount,
                expiration,
                HashedAliceSecret,
                receiver,
                outputNetwork,
                outputAddress
            ),
            1
        );
        
        //vm.expectEmit(true, true, false, true, address(HtlcManager));
        vm.recordLogs();

        HtlcManager.newContract{value: inputAmountEth}(
            outputAmount, expiration, HashedAliceSecret, receiver, outputNetwork, outputAddress
        );

        Vm.Log[] memory entries = vm.getRecordedLogs();

        // get contract id from event
        assertEq(entries.length, 1);
        bytes32 id = entries[0].topics[1];
        assertEq(HashedAliceSecret, keccak256(abi.encode(AliceSecret)));
        HtlcManager.withdraw(id, AliceSecret);
    }

}
