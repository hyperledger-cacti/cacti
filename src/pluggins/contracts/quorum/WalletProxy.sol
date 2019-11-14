pragma solidity ^0.5.1;

import "./Wallet.sol";

contract WalletProxy {

    Wallet wallet;

    constructor() public {
        wallet = new Wallet();
    }

    function getAsset(string memory assetID) public view returns (
        string memory dltID,
        string memory origins,
        string memory property1,
        string memory property2,
        bool locked,
        string memory targetDltId,
        string memory receiverPK
    )
    {
        return wallet.getAsset(assetID);
    }

    function createAsset(
        string memory assetID,
        string memory origins,
        string memory property1,
        string memory property2
    )
        public
    {
        wallet.createAsset(assetID, origins, property1, property2);
    }

    function lockAsset(
        string memory assetID,
        string memory targetDltId,
        string memory receiverPK
    )
        public
    {
        wallet.lockAsset(assetID, targetDltId, receiverPK);
    }

    function setProperty(
        string memory assetID,
        string memory propertyName,
        string memory propertyValue
    )
        public
    {
        wallet.setProperty(assetID, propertyName, propertyValue);
    }
}
