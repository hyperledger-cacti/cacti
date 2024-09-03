// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.7.0 <0.9.0;
import "remix_tests.sol";
import "../contracts/CBDCcontract.sol";
import "../contracts/AssetReferenceContract.sol";

contract CBDCcontractTest {

    address bridge_address = address(0xf28d5769171bfbD2B3628d722e58129a6aE15022);
    AssetReferenceContract assetRefContract;
    CBDCcontract cbdcContract;

    function beforeEach () public {
        cbdcContract = new CBDCcontract();
        assetRefContract = new AssetReferenceContract(address(cbdcContract));

        cbdcContract.setAssetReferenceContract(address(assetRefContract));
        cbdcContract.setAssetReferenceContract(address(assetRefContract));
        assetRefContract.addOwner(address(cbdcContract));
    }

    function testTokenNameAndSymbol () public {
        Assert.equal(cbdcContract.name(), "CentralBankDigitalCurrency", "token name did not match");
        Assert.equal(cbdcContract.symbol(), "CBDC", "token symbol did not match");
    }

    function mintEscrowAndBurnTokens () public {
        cbdcContract.mint(address(this), 222);
        uint256 balance = cbdcContract.balanceOf(address(this));
        Assert.equal(balance, 222, "tokens minted did not match");
    }

    function escrowTokens() public {
        cbdcContract.mint(address(this), 222);
        cbdcContract.escrow(222, "id1");

        Assert.equal(assetRefContract.isPresent("id1"), true, "asset reference should be present");
        Assert.equal(cbdcContract.balanceOf(bridge_address), 222, "bridge balance not updated");
    }

    function burnTokens() public {
        cbdcContract.mint(address(this), 222);
        cbdcContract.escrow(222, "id1");
        cbdcContract.burn(222);

        Assert.equal(cbdcContract.balanceOf(bridge_address), 0, "bridge balance not updated");
    }
}