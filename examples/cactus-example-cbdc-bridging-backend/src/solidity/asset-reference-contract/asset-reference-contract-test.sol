// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.7.0 <0.9.0;
import "remix_testassetRefContract.sol";
import "../contracts/CBDCcontract.sol";
import "../contracts/AssetReferenceContract.sol";

contract AssetReferenceContractTest {

    AssetReferenceContract assetRefContract;
    CBDCcontract cbdc_contract;

    function beforeEach () public {
        cbdc_contract = new CBDCcontract();
        assetRefContract = new AssetReferenceContract(address(cbdc_contract));

        cbdc_contract.setAssetReferenceContract(address(assetRefContract));
        cbdc_contract.transferOwnership(address(assetRefContract));
    }

    function createAssetReferenceSuccessfully () public {
        assetRefContract.createAssetReference("id1", 123, address(0xAb8483F64d9C6d1EcF9b849Ae677dD3315835cb2));

        AssetReference memory asset = assetRefContract.getAssetReference("id1");
        Assert.equal(asset.id, "id1", "asset reference id did not match");
        Assert.equal(asset.isLocked, false, "asset reference lock state did not match");
        Assert.equal(asset.amount, 123, "asset reference amount did not match");
        Assert.equal(asset.recipient, address(0xAb8483F64d9C6d1EcF9b849Ae677dD3315835cb2), "asset reference recipient did not match");
    }

    function lockAndUnlockAssetReferenceSuccessfully () public {
        assetRefContract.createAssetReference("id1", 123, address(0xAb8483F64d9C6d1EcF9b849Ae677dD3315835cb2));

        assetRefContract.lockAssetReference("id1");
        AssetReference memory asset1 = assetRefContract.getAssetReference("id1");
        Assert.equal(asset1.id, "id1", "asset reference id did not match");
        Assert.equal(asset1.isLocked, true, "asset reference lock state did not match");

        assetRefContract.unLockAssetReference("id1");
        asset1 = assetRefContract.getAssetReference("id1");
        Assert.equal(asset1.id, "id1", "asset reference id did not match");
        Assert.equal(asset1.isLocked, false, "asset reference lock state did not match");
    }

    function deleteAssetReferenceSuccessfully () public {
        assetRefContract.createAssetReference("id1", 123, address(0xAb8483F64d9C6d1EcF9b849Ae677dD3315835cb2));
        assetRefContract.deleteAssetReference("id1");

        bool exists = assetRefContract.isPresent("id1");
        Assert.equal(exists, false, "asset reference did not match");
    }

    function mintTokens () public {
        assetRefContract.mint(address(0xAb8483F64d9C6d1EcF9b849Ae677dD3315835cb2), 123);

        uint256 balance = cbdc_contract.balanceOf(address(0xAb8483F64d9C6d1EcF9b849Ae677dD3315835cb2));
        Assert.equal(balance, 123, "tokens minted did not match");
    }

}